const path = require("path")
const fs = require("fs")
const { USE_EIP1559 } = require("../t0_config")
const { ethers } = require("ethers")
const log = console.log.bind(console)
const ethUtils = ethers.utils
const prompt = require("prompt-sync")({ sigint: true })

class BlockChainNetwork {
    constructor({ name, rpc, chainId, symbol = "ETH", ws = null, apiurl = "", args = [] }) {
        this.name = name
        this.http_rpc = rpc
        this.chain_id = chainId
        this.api_url = apiurl
        this.wss = ws
        this.params = args
    }
}

const load_network = (network_name = "eth") => {
    const networks_filename = path.resolve(__dirname, "networks.json")
    const data = fs.readFileSync(networks_filename)
    const networks = JSON.parse(data)
    for (const network of networks) {
        if (network["name"].toLowerCase() === network_name.toLowerCase()) {
            return new BlockChainNetwork(network)
        }
    }
    log(network_name, "没有定义", "请检查文件：")
    log(networks_filename)
    throw new Error(`${network_name} is not defined!`)
}

const cal_gas_params = async (web3, priority_fee) => {
    const feeData = await web3.getFeeData()

    if (USE_EIP1559) {
        log("[gas], ⏳ 预估gas price...")
        const maxFeePerGas = feeData["maxFeePerGas"]
        log(`maxFeePerGas: ${ethUtils.formatUnits(maxFeePerGas.toString(), "gwei")} gwei`)
        log("[gas]", "ℹ️ 给矿工消费", priority_fee, "GWei")

        return {
            type: 2,
            maxPriorityFeePerGas: ethUtils.parseUnits(priority_fee.toString(), "gwei"),
            maxFeePerGas: maxFeePerGas,
        }
    } else {
        const gasPrice = feeData["gasPrice"]
        const priorityBigNum = ethUtils.parseUnits(priority_fee.toString(), "gwei")

        return {
            gasPrice: gasPrice.add(priorityBigNum),
        }
    }
}

const sign_and_send_txn = async (web3, transaction, wallet, estimate = false) => {
    const gas_limit_key = "gasLimit"
    log("transaction", transaction)

    if (estimate || !(gas_limit_key in transaction)) {
        log("[gas]", "⏳ 预计Gas Limit...")
        const gas_estimate = await web3.estimateGas(transaction)
        const gas_estimate_format = ethers.utils.formatUnits(gas_estimate, "wei")
        log("gas_estimate: ", gas_estimate_format)
        const gas_preset_format = transaction[gas_limit_key] || 0
        const gas_preset = ethers.utils.parseUnits(gas_preset_format.toString(), "wei")
        log("gas_preset: ", ethers.utils.formatUnits(gas_preset_format.toString(), "wei"))
        if (gas_estimate.gt(gas_preset)) {
            transaction[gas_limit_key] = gas_estimate
            log("[gas]", "✅Gas更新为", gas_estimate_format)
        } else if (gas_estimate.lt(gas_preset)) {
            const resp = prompt(
                `你输入的gas(${gas_preset_format})比预计的(${gas_estimate_format})要高，是否使用推荐值？y/n \n`
            )
            if (resp.toLowerCase() === "y") {
                transaction[gas_limit_key] = gas_estimate
                log("[gas]", "✅Gas更新为", gas_estimate_format, `(原来设置为${gas_preset_format})`)
            } else {
                log("[gas]", "ℹ️Gas保持设定值", gas_preset_format)
            }
        } else {
            log("[gas]", `👍你的Gas设定很完美 ${gas_preset_format}`)
        }
    }

    const signedTx = await wallet.signTransaction(transaction)
    log("[txn]", "✍️交易已签名，广播至网络...")
    const response = await web3.sendTransaction(signedTx)
    // log('[txn]', '✅交易已广播', `https://goerli.etherscan.io/tx/{HexBytes(tx_hash).hex()}`)
    log("[txn]", "⏳等待链上确认...")
    const tx_hash = response["hash"]
    const tx_receipt = await web3.waitForTransaction(tx_hash)
    log("[txn]", "ℹ️ 交易回执信息 ==> ", tx_receipt)
    log(
        "[txn]",
        "ℹ️查看交易信息 ==>  ",
        `https://goerli.etherscan.io/tx/${tx_receipt["transactionHash"]}`
    )
}

const transact_with_input = async (
    web3,
    from_addr,
    wallet,
    to_addr,
    val_in_eth,
    input_data,
    gas_params = null,
    gasLimit = null
) => {
    const nonce = await web3.getTransactionCount(from_addr)
    const { chainId } = await web3.getNetwork()
    if (gas_params === null) {
        gas_params = cal_gas_params(web3, 0.1)
    }
    let raw_txn
    raw_txn = {
        to: to_addr,
        value: ethers.utils.parseUnits(val_in_eth.toString(), "ether"),
        nonce: nonce,
        data: input_data,
        chainId: chainId,
        ...gas_params,
    }
    if (gasLimit) {
        raw_txn = {
            ...raw_txn,
            gasLimit,
        }
    }

    log("raw_txn", raw_txn)

    log("交易创建成功")

    await sign_and_send_txn(web3, raw_txn, wallet, true)
}

const _init_contract = (web3, contract) => {
    const abi = JSON.parse(fs.readFileSync(`abi/${contract}.json`, "utf-8"))
    return new ethers.Contract(ethers.utils.getAddress(contract), abi, web3)
}

const transact_func = async (
    web3,
    wallet,
    contract,
    func_name,
    func_args,
    val_in_eth,
    priority_fee_in_gwei,
    gas_params = null
) => {
    const smart_contract = _init_contract(web3, contract)
    if (gas_params === null) {
        gas_params = await cal_gas_params(web3, priority_fee_in_gwei)
    }
    const nonce = web3.getTransactionCount(wallet.address)
    const { chainId } = await web3.getNetwork()
    const unsignedTx = await smart_contract.populateTransaction[func_name](...func_args, {
        value: ethers.utils.parseUnits(val_in_eth.toString(), "ether"),
        nonce,
        ...gas_params,
        // gasLimit: 100000,
    })
    unsignedTx.chainId = chainId

    await sign_and_send_txn(web3, unsignedTx, wallet, true)
}

module.exports = {
    load_network,
    log,
    cal_gas_params,
    sign_and_send_txn,
    transact_with_input,
    transact_func,
    _init_contract,
}

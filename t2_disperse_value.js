const { ethers } = require("ethers")
const path = require("path")
const fs = require("fs")
const prompt = require("prompt-sync")()

const { get_names } = require("./t0_config")
const { load_network, log, cal_gas_params, sign_and_send_txn } = require("./helpers/toolkit")

require("dotenv").config()

network_info = load_network("local")
const w3 = new ethers.providers.JsonRpcProvider(network_info.http_rpc)

const my_address = process.env["ADDRESS"]
const my_private_key = process.env["PRIVATE_KEY"]
const my_wallet = new ethers.Wallet(my_private_key, w3)

const main = async () => {
    const abi_path = path.join(path.resolve(__dirname, "abi"), "disperse-abi.json")
    const abi = JSON.parse(fs.readFileSync(abi_path, "utf-8"))

    // 准备分发合约
    const DISPERSE_CONTRACT = "0xD152f549545093347A162Dce210e7293f1452150"
    const DisperseApp = new ethers.Contract(DISPERSE_CONTRACT, abi, w3)
    // log(DisperseApp)

    // 交易前准备
    // 获取当前地址的nonce
    const nonce = w3.getTransactionCount(my_address)
    const balance = await w3.getBalance(my_address)
    log(`ETH Main Balance of ${my_address} --> ${ethers.utils.formatEther(balance)} ETH\n`)

    // 导入批文件
    const filenames = get_names()
    const all_accounts = JSON.parse(fs.readFileSync(filenames["account_filename"], "utf-8"))
    all_accounts.forEach((account) => {
        const v = account["value"]
        account["value_in_wei"] = ethers.utils.parseUnits(v.toString(), 18)
    })
    const total = all_accounts.reduce(
        (pre, curr) => {
            const pre_val = pre.value
            const curr_val = ethers.utils.parseEther(curr.value.toString())
            return { value: pre_val.add(curr_val) }
        },
        { value: ethers.utils.parseEther("0") }
    ).value

    log("# 当前生成账户余额")
    for (const account of all_accounts) {
        const balance = await w3.getBalance(account["address"])
        log(`-${account["address"]} -----> ${ethers.utils.formatEther(balance)} `)
    }
    log("val", total, "ETH")
    // prompt("* 按下 enter 键继续...")

    // 开始交互
    log("# 链上交互开始")
    const gas_params = await cal_gas_params(w3, 0.4)

    log("# 构建交易并预估gas")
    const all_accounts_addresses = all_accounts.map((account) => {
        return account["address"]
    })
    const all_accounts_value_in_wei = all_accounts.map((account) => {
        return account["value_in_wei"]
    })
    const all_accounts_value = all_accounts.map((account) => {
        return account["value"]
    })

    log("all_accounts_addresses", all_accounts_addresses)
    log(
        "all_accounts_value",
        all_accounts_value,
        all_accounts_value_in_wei
        // ethers.utils.formatUnits(all_accounts_value_in_wei[0], "wei")
    )

    const { chainId } = await w3.getNetwork()
    const unsignedTx = await DisperseApp.populateTransaction["disperseEther"](
        all_accounts_addresses,
        all_accounts_value_in_wei,
        {
            value: ethers.utils.parseUnits(total.toString(), "wei"),
            nonce,
            ...gas_params,
            // gasLimit: 100000,
        }
    )
    unsignedTx.chainId = chainId

    await sign_and_send_txn(w3, unsignedTx, my_wallet, true)

    log("# 当前生成账户余额")
    for (const account of all_accounts) {
        const balance = await w3.getBalance(account["address"])
        log(`- ${account["address"]} -----> ${ethers.utils.formatEther(balance)} `)
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })

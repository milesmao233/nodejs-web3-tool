const {
    load_network,
    log,
    cal_gas_params,
    sign_and_send_txn,
    transact_func,
    _init_contract,
} = require("./helpers/toolkit")
const { ethers } = require("ethers")
const fs = require("fs")
require("dotenv").config()

const call_func = async (web3, contract, func_name, func_args) => {
    log("[call]", `ℹ️初始化合约：${contract}`)
    const smart_contract = _init_contract(web3, contract)
    log("[call]", `⏳ 请求 ${contract}`)
    log("[call]", `- ${func_name}(${func_args.join(", ")})...`)
    const response = await smart_contract.callStatic[func_name](...func_args)
    log("[call]", `✅返回：${response}`)
    // return response
}

const main = async () => {
    // 参数配置
    const NETWORK_NAME = "local" // 交互的网络
    const network_info = load_network(NETWORK_NAME)
    const w3 = new ethers.providers.JsonRpcProvider(network_info.http_rpc)
    const functon = "disperseEther" // 要交互的方法名称
    const args = [
        ["0xA8B7E61924a05a4e3E830Ba54cc35DF17fd5324d"],
        [ethers.utils.parseEther((0.5).toString())],
    ] //交互时候输入的参数，如果这边希望填入自己地址，可以用 '0_o'
    const contract_addr = "0xD152f549545093347A162Dce210e7293f1452150" // 交互合约地址
    const mode = 2 // 0: 只读，1: 写入（需要gas），2: 写入Pay（需要gas和主链币）
    // 参数配置-尾

    if (mode === 0) {
        await call_func(w3, contract_addr, functon, args)
    } else {
        // [额外参数] `mode` 为 1 或 2 才需要
        const priority_fee_in_gwei = 0.4
        const val = 0.5

        if (mode === 2 && val <= 0) {
            throw new Error("这个交互得额外加钱，请设置 `val`")
        }
        if (mode === 1 && val > 0) {
            throw new Error("这个交互不用额外价钱，请设置 `val = 0`")
        }

        const my_private_key = process.env["PRIVATE_KEY"]
        const my_wallet = new ethers.Wallet(my_private_key, w3)

        await transact_func(w3, my_wallet, contract_addr, functon, args, val, priority_fee_in_gwei)
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })

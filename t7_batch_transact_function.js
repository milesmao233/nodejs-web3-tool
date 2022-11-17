const { load_network, log, cal_gas_params, transact_func } = require("./helpers/toolkit")
const { ethers } = require("ethers")
const { get_names } = require("./t0_config")
const fs = require("fs")
const main = async () => {
    // // 参数配置
    const NETWORK_NAME = "local" // 交互的网络
    const network_info = load_network(NETWORK_NAME)
    const w3 = new ethers.providers.JsonRpcProvider(network_info.http_rpc)
    const functon = "disperseEther" // 要交互的方法名称
    const args = [
        ["0x369880e22a5Eb800526A5F84FC155661590c9C4a"],
        [ethers.utils.parseEther((0.5).toString())],
    ] //交互时候输入的参数，如果这边希望填入自己地址，可以用 '0_o'
    const contract_addr = "0xD152f549545093347A162Dce210e7293f1452150" // 交互合约地址

    const priority_fee_in_gwei = 0.1 // 给矿工的抢跑小费
    const val = 0.5 // 从 etherscan 上获取的转账金额，大部分合约交互为0
    // 参数配置-尾

    // 准备账户
    const filenames = get_names()
    const account_file = filenames["account_filename"]

    const all_accounts = JSON.parse(fs.readFileSync(account_file, "utf-8"))

    for (const account of all_accounts) {
        const index = all_accounts.indexOf(account)
        log()
        log("----------------------------")
        log("[msg]", index + 1, account["address"], "processing...")
        const estimated_gas_params = await cal_gas_params(w3, priority_fee_in_gwei)
        const each_wallet = new ethers.Wallet(account["private_key"], w3)

        await transact_func(
            w3,
            each_wallet,
            contract_addr,
            functon,
            args,
            val,
            priority_fee_in_gwei,
            estimated_gas_params
        )
    }

    const balance = await w3.getBalance("0x369880e22a5Eb800526A5F84FC155661590c9C4a")
    log("balance  ====>  ", ethers.utils.formatEther(balance))
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })

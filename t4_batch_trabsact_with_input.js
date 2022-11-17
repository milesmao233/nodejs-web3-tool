const { load_network, log, cal_gas_params, transact_with_input } = require("./helpers/toolkit")
const { ethers } = require("ethers")
const { get_names } = require("./t0_config")
const fs = require("fs")
require("dotenv").config()

const main = async () => {
    // 参数配置
    const NETWORK_NAME = "local" // 交互的网络
    const contract_addr = "0xD152f549545093347A162Dce210e7293f1452150" // 交互合约地址
    const gasLimit = 199927 // 从 ether scan 上获取的gas limit
    const val = 2 // 从 ether scan 上获取的转账金额，大部分合约交互为0
    const priority_fee_in_gwei = 0.4 // 给矿工的抢跑小费

    // 从 ether scan 上抄来的原始输入数据（Original）
    const raw_input =
        "0xe63d38ed000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000002000000000000000000000000a8b7e61924a05a4e3e830ba54cc35df17fd5324d00000000000000000000000055eb03986d0706427180d53d628a3bab4d53882400000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000000000de0b6b3a7640000"
    // 参数配置-尾

    const network_info = load_network(NETWORK_NAME)
    const w3 = new ethers.providers.JsonRpcProvider(network_info.http_rpc)
    const my_address = process.env["ADDRESS"]
    const my_private_key = process.env["PRIVATE_KEY"]
    const my_wallet = new ethers.Wallet(my_private_key, w3)

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

        await transact_with_input(
            w3,
            my_address,
            my_wallet,
            contract_addr,
            val,
            raw_input,
            estimated_gas_params,
            gasLimit
        )
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })

const {
    load_network,
    cal_gas_params,
    log,
    sign_and_send_txn,
    transact_with_input,
} = require("./helpers/toolkit")
const { ethers } = require("ethers")
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
        "0xe63d38ed000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000002000000000000000000000000157e05d3aaa79a4f09347bba08747fc290c1c5a60000000000000000000000009fafb2d1623105eef3b5c50e630f78f4401989a200000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000000000de0b6b3a7640000"
    // 参数配置-尾

    const network_info = load_network(NETWORK_NAME)
    const w3 = new ethers.providers.JsonRpcProvider(network_info.http_rpc)
    const my_address = process.env["ADDRESS"]
    const my_private_key = process.env["PRIVATE_KEY"]
    const my_wallet = new ethers.Wallet(my_private_key, w3)

    await transact_with_input(
        w3,
        my_address,
        my_wallet,
        contract_addr,
        val,
        raw_input,
        await cal_gas_params(w3, priority_fee_in_gwei),
        gasLimit
    )
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })

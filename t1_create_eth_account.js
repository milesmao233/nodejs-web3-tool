const { ethers } = require("ethers")
const fs = require("fs")
const { get_names } = require("./t0_config")

const url = "http://localhost:8545"
const w3 = new ethers.providers.JsonRpcProvider(url)
const ACCOUNT_AMOUNT = 2
const EACH_VAL = 1 // 每次攻击需要准备的主币种，比如0.01个ETH
const { account_filename, address_filename, address_value_filename, private_key_filename } =
    get_names() // 存储文件名

const main = async () => {
    const accounts = []
    const addresses = []
    const address_values = []
    const private_keys = []
    for (let i = 0; i < ACCOUNT_AMOUNT; i++) {
        const wallet = await ethers.Wallet.createRandom()
        const address = wallet.address
        const private_key = wallet.privateKey
        accounts.push({
            address,
            private_key_with0x: private_key,
            value: EACH_VAL,
            private_key: private_key.slice(2),
        })
        addresses.push(address)
        address_values.push([address, EACH_VAL])
        private_keys.push(private_key.slice(2))
    }

    console.log("创建的 accounts", accounts)
    const data = JSON.stringify(accounts)
    const addresses_data = JSON.stringify(addresses)
    const address_values_data = JSON.stringify(address_values)
    const private_keys_data = JSON.stringify(private_keys)

    fs.writeFileSync(account_filename, data)
    fs.writeFileSync(address_filename, addresses_data)
    fs.writeFileSync(address_value_filename, address_values_data)
    fs.writeFileSync(private_key_filename, private_keys_data)

    console.log("完成✅")
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})

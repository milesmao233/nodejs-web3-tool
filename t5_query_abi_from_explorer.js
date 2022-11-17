const { load_network, log } = require("./helpers/toolkit")
const axios = require("axios")
const fs = require("fs")
require("dotenv").config()

const main = async () => {
    // 参数配置
    const NETWORK_NAME = "local" // 交互的网络
    const contract_addr = "0xD152f549545093347A162Dce210e7293f1452150" // 交互合约地址
    // 参数配置-尾

    // 网络准备
    const network_info = load_network(NETWORK_NAME)
    const ether_scan_key = process.env["ETHERSCAN_KEY"]

    if (!network_info.api_url) {
        throw new Error(`${NETWORK_NAME}没有配置API，请在 networks.json 中完善相关信息`)
    }
    log(`请求区块链浏览器API... ${network_info.api_url + contract_addr}`)
    const response = await axios.get(network_info.api_url + contract_addr, {
        params: {
            apikey: ether_scan_key,
        },
    })
    // const response_json = JSON.parse(response)

    const data = response["data"]
    let response_json
    if (data["status"] === "1" && data["message"] === "OK") {
        response_json = data["result"]
    } else {
        throw new Error(`返回数据有误, 原因 ${data["result"]}`)
    }

    const source_code = response_json[0]
    const abi = JSON.parse(source_code["ABI"])
    fs.writeFileSync(`abi/${contract_addr}.json`, JSON.stringify(abi))

    // 有三种主要的函数:
    // 1. 只读，不用gas："stateMutability": "view"
    // 2. 需要gas的函数："stateMutability": "nonpayable"
    // 3. 需要gas且需要主币的函数："stateMutability": "payable"

    const functions = [
        {
            name: "view",
            items: abi
                .filter((item) => {
                    return item["type"] === "function" && item["stateMutability"] === "view"
                })
                .sort((a, b) => {
                    const nameA = a.name.toUpperCase() // ignore upper and lowercase
                    const nameB = b.name.toUpperCase() // ignore upper and lowercase
                    if (nameA < nameB) {
                        return -1
                    }
                    if (nameA > nameB) {
                        return 1
                    }
                    return 0
                }),
        },
        {
            name: "func",
            items: abi
                .filter((item) => {
                    return item["type"] === "function" && item["stateMutability"] === "nonpayable"
                })
                .sort((a, b) => {
                    const nameA = a.name.toUpperCase() // ignore upper and lowercase
                    const nameB = b.name.toUpperCase() // ignore upper and lowercase
                    if (nameA < nameB) {
                        return -1
                    }
                    if (nameA > nameB) {
                        return 1
                    }
                    return 0
                }),
        },
        {
            name: "payable",
            items: abi
                .filter((item) => {
                    return item["type"] === "function" && item["stateMutability"] === "payable"
                })
                .sort((a, b) => {
                    const nameA = a.name.toUpperCase() // ignore upper and lowercase
                    const nameB = b.name.toUpperCase() // ignore upper and lowercase
                    if (nameA < nameB) {
                        return -1
                    }
                    if (nameA > nameB) {
                        return 1
                    }
                    return 0
                }),
        },
    ]

    log("functions", JSON.stringify(functions))

    for (const func of functions) {
        log("===================", func["name"], "===================")
        // for (const item of func["items"]) {
        //     item["input"].forEach((i) => {
        //         log(i)
        //     })
        // }

        func["items"].forEach((item) => {
            // log("item", item)
            const _args = item["inputs"].map((i) => `${i["name"]}:${i["type"]}`).join(", ")
            log(`${item["name"]}(${_args})`)
        })
        log("============================================")
        log()
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })

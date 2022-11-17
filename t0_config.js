const moment = require("moment")

const PROJECT_NAME = "Miles1"
const USE_EIP1559 = true

const get_names = (as_of_date = null) => {
    if (as_of_date === null) {
        as_of_date = moment().format("YYYY-MM-DD")
    }

    return {
        account_filename: `${PROJECT_NAME}_eth_accounts_${as_of_date}.json`,
        address_filename: `${PROJECT_NAME}_eth_address_${as_of_date}.json`,
        address_value_filename: `${PROJECT_NAME}_eth_address_with_value_${as_of_date}.json`,
        private_key_filename: `${PROJECT_NAME}_prikey_${as_of_date}.prikey`,
    }
}

module.exports = { get_names, USE_EIP1559 }

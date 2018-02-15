const exec = require("child_process").exec;
const config = require("abcdi-conf.json");
const cli_path = "./" + config.path;
const company_wallet = config.company_wallet;
const minerfee = config.miner_fee;
const companyfee = config.company_fee;

function createRawTransaction (from_addr, to_addr, amount, take_fees, fees_from_sender, callback) {
    //garlicoin-cli createrawtransaction '[{"txid" :"<txid>", "vout" : <vout>}]' '{"<to_addr>": <amount>, "<company_wallet>": <garlictxfee>, "<from_addr>": <change>}'
    exec (cli_path + " listunspent 1 99999999 '[\"" + from_addr + "\"]'", function (err, stdout, stderr) {
        if (err) {
            return callback(err);
        }
        var inputTXs = [];
        var unspents = JSON.parse(stdout);
        for (let i = 0; i < unspents.length; i ++) {
            var unspent = unspents[i];
            if (unspent.amount >= amount) {
                if (inputTXs.length > 0) {
                    if (inputTXs[0].amount - amount > unspent.amount - amount) {
                        inputTXs[0] = unspent;
                    }
                } else {
                    inputTXs[0] = unspent;
                }
            }
        }
        if (inputTXs.length == 0) {
            for (let i = 0; i < unspents.length; i ++) {
                inputTXs[i] = unspents[i];
                var total = 0;
                for (var unspent in inputTXs) {
                    total += unspent.amount;
                }
                if (total > amount) {
                    break;
                }
            }
        }
        var total = 0;
        for (let i = 0; i < inputTXs.length; i ++) {
            var unspent = inputTXs[i];
            total += unspent.amount;
            console.log("Added transaction: " + unspent.amount);
        }
        if (total < amount) {
            return callback("balance_low");
        }
        var garlictxfee = take_fees ? amount * companyfee : 0;
        var change = (total * 1000000 - amount * 1000000 - minerfee * 1000000 - garlictxfee * 1000000) / 1000000;
        if (!fees_from_sender) {
            change = (total * 1000000 - amount * 1000000 - garlictxfee * 1000000) / 1000000;
        }
        console.log("Total: " + total + " Amount: " + amount + " Miner fee: " + minerfee + " Our fee: " + garlictxfee + " Change: " + change);
        var createTXCommand = cli_path + " createrawtransaction ";
        var inputTXsFormatted = [];
        for (let i = 0; i < inputTXs.length; i ++) {
            inputTXsFormatted[i] = {txid:inputTXs[i].txid, vout:inputTXs[i].vout};
        }
        createTXCommand += "'" + JSON.stringify(inputTXsFormatted) + "' ";
        var outputs = "{\"" + to_addr + "\":" + (fees_from_sender ? amount : (amount * 1000000 - minerfee * 1000000) / 1000000) + (take_fees ? ", \"" + company_wallet + "\":" + garlictxfee : "") + (change > 0 ? ", \"" + from_addr + "\":" + change : "") + "}";
        createTXCommand += "'" + outputs + "'";
        exec (createTXCommand, function (err, stdout, stderr) {
            if (err) {
                return callback(err);
            }
            return callback(null, stdout.replace("\n", ""), inputTXs);
        });
    });
}

function signRawTransaction (tx_hex, from_addr, input_txs, callback) {
    //garlicoin-cli signrawtransaction '<tx_hex>' '[{"txid" :"<txid>", "vout" : <vout>, "scriptPubKey":"<scriptPubKey>"}]' '["<from_addr priv key>"]'
    exec (cli_path + " dumpprivkey " + from_addr, function (err, stdout, stderr) {
        if (err) {
            return callback(err);
        }
        var privKey = stdout.replace("\n", "");
        var command = cli_path + " signrawtransaction '" + tx_hex + "' ";
        var inputTXsFormatted = [];
        for (let i = 0; i < input_txs; i ++) {
            var intx = input_txs[i];
            inputTXsFormatted[i] = {txid:intx.txid, vout:intx.vout, scriptPubKey:intx.scriptPubKey};
        }
        command += "'" + JSON.stringify(inputTXsFormatted) + "' '[\"" + privKey + "\"]'";
        exec (command, function (err, stdout, stderr) {
            if (err) {
                return callback(err);
            }
            return callback(null, JSON.parse(stdout).hex);
        });
    });
}

function sendRawTransaction (tx_signed_hex, callback) {
    //garlicoin-cli sendrawtransaction <tx_signed_hex>
    var command = cli_path + " sendrawtransaction " + tx_signed_hex + "";
    exec(command, function (err, stdout, stderr) {
        if (err) {
            return callback(err);
        }
        return callback(null, stdout.replace("\n", ""));
    });
}

function transferFromToAddress (from_addr, to_addr, amount, take_fees, fees_from_sender) {
    return new Promise ((fullfill, reject) => {
        createRawTransaction(from_addr, to_addr, amount, take_fees, fees_from_sender, function (err, tx_hex, input_txs) {
            if (err) {
                reject(err);
            }
            signRawTransaction(tx_hex, from_addr, input_txs, function (err, tx_signed_hex) {
                if (err) {
                    reject(err);
                }
                sendRawTransaction(tx_signed_hex, function (err, txid) {
                    if (err) {
                        reject(err);
                    }
                    fullfill(txid);
                });
            });
        });
    });
}

function checkBalance (addr, min_conf) {
    return new Promise ((fullfill, reject) => {
        var command = cli_path + " listunspent " + min_conf + " 99999999 '[\"" + addr + "\"]'";
        exec(command, function (err, stdout, stderr) {
            if (err) {
                reject(err);
            }
            console.log(stdout);
            console.log(stderr);
            let unspents = JSON.parse(stdout);
            let total = 0;
            for (let i = 0; i < unspents.length; i++) {
                total += unspents[i].amount;
            }
            fullfill(total);
        });
    });
}

function validateAddress (addr) {
	return new Promise ((fullfill, reject) => {
		exec(cli_path + " validateaddress " + addr, function (err, stdout, stderr) {
			if (err) {
				reject(err);
			}
			let wallet_validate = JSON.parse(stdout);
			fullfill(wallet_validate.isvalid);
		});
	});
}

function generateAddress () {
    return new Promise ((fullfill, reject) => {
        exec(cli_path + " getnewaddress", function (err, stdout, stderr) {
            if (err) {
                reject(err);
            }
            let newaddress = stdout.replace("\n", "");
            fullfill(newaddress);
        });
    });
}

module.exports = {
    transferFromToAddress: transferFromToAddress,
    createRawTransaction: createRawTransaction,
    sendRawTransaction: sendRawTransaction,
    signRawTransaction: signRawTransaction,
	checkBalance: checkBalance,
    validateAddress: validateAddress,
    generateAddress: generateAddress
};
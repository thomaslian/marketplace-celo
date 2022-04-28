import Web3 from 'web3';
import { newKitFromWeb3 } from '@celo/contractkit';
import BigNumber from "bignumber.js";
import marketplaceAbi from '../contract/marketplace.abi.json';
import erc20Abi from "../contract/erc20.abi.json";
import { cUSDContractAddress, ERC20_DECIMALS, MPContractAddress } from "./constants";

let kit;
let contract;
let products = [];

const connectCeloWallet = async () => {
    if (window.celo) { // Check if Celo wallet is installed
        notification("⚠️ Please approve this DApp to use it.");
        try {
            await window.celo.enable(); // Approve DApp to use Celo wallet
            notificationOff();

            const web3 = new Web3(window.celo); // Creates a web3 object using Celo as the provider
            kit = newKitFromWeb3(web3); // Kit can now interact with the Celo Blockchain

            const accounts = await kit.web3.eth.getAccounts(); // Get the accounts from the Celo wallet
            kit.defaultAccount = accounts[0]; // Set the default account to the first account

            contract = new kit.web3.eth.Contract(marketplaceAbi, MPContractAddress); // Create a contract object using the marketplace contract

        } catch (e) {
            notification(`⚠️ ${error}.`);
        }
    } else {
        notification("⚠️ Please install the Celo Wallet extension.");
    }
}

const approve = async (price) => {
    const cUSDContract = new kit.web3.eth.Contract(erc20Abi, cUSDContractAddress); // Create a contract object using the cUSD contract

    const result = await cUSDContract.methods
        .approve(MPContractAddress, price)
        .send({ from: kit.defaultAccount });
    return result;
}

const getBalance = async () => {
    const totalBalance = await kit.getTotalBalance(kit.defaultAccount); // Get the total balance of the default account
    const cUSDBalance = totalBalance.cUSD.shiftedBy(-ERC20_DECIMALS).toFixed(2); // Get a readable cUSD balance
    document.querySelector("#balance").textContent = cUSDBalance;
}

const getTotalPriceOfNFTs = async () => {
    let totalPrice = await contract.methods.getTotalPriceOfNFTs().call();
    totalPrice /= Math.pow(10, ERC20_DECIMALS).toFixed(2);
    document.querySelector("#totalPrice").textContent = totalPrice;
}

const getProducts = async () => {
    const productsLength = await contract.methods.getProductsLength().call();
    const _products = [];

    for (let i = 0; i < productsLength; i++) {
        let product = new Promise(async (resolve, reject) => {
            let p = await contract.methods.readProduct(i).call(); // Use the getProduct method in the contract
            resolve({ // Resolve the promise to return product data
                index: i,
                owner: p[0],
                name: p[1],
                image: p[2],
                description: p[3],
                price: new BigNumber(p[4]), // Needs to be a bigNumber object 
                sold: p[5],
            });
            reject(error => { console.log(error) }); // Reject the promise if there is an error    
        });
        _products.push(product);
    }
    products = await Promise.all(_products);
    renderProducts();
}

const getContractAddress = async () => {
    console.log(await contract.methods.getContractAddress().call());
}

function renderProducts() {
    document.getElementById("marketplace").innerHTML = "";
    products.forEach(product => {
        const newDiv = document.createElement("div");
        newDiv.className = "col-md-4";
        newDiv.innerHTML = productTemplate(product);
        document.getElementById("marketplace").appendChild(newDiv);
    });
}

function productTemplate(product) {
    const productSold = parseInt(product.sold);
    const productPrice = (product.price / Math.pow(10, ERC20_DECIMALS).toFixed(2));
    return `
        <div class="card border-secondary mb-4">
            <img class="card-img-top" src="${product.image}" alt="Card image">
            <div class="position-absolute top-0 end-0 ${productSold ? `bg-danger text-white` : `bg-warning`} mt-4 px-2 py-1 rounded-start">
                ${productSold ? "Sold" : "For Sale"}
            </div>
            <div class="card-body text-left p-4 position-relative">
                <div class="translate-middle-y position-absolute top-0">
                    ${identiconTemplate(product.owner)}
                </div>
                <h2 class="card-title fs-4 fw-bold mt-2">${product.name}</h2>
                <p class="card-text mb-4" style="min-height: 82px">
                ${product.description}             
                </p>
                <div class="d-grid gap-2">
                <a class="btn btn-lg buyBtn fs-6 p-3 ${productSold ? "btn-secondary disabled" : "btn-outline-dark"}" id=${product.index}>
                    Buy for ${productPrice} cUSD
                </a>
            </div>
          </div>
        </div>
    `;
}

function identiconTemplate(address) {
    const icon = blockies
        .create({
            seed: address,
            size: 8,
            scale: 16,
        })
        .toDataURL();

    return `
    <div class="rounded-circle overflow-hidden d-inline-block border border-white border-2 shadow-sm m-0">
      <a href="https://alfajores-blockscout.celo-testnet.org/address/${address}/transactions"
          target="_blank">
          <img src="${icon}" width="48" alt="${address}">
      </a>
    </div>
    `
}

function notification(_text) {
    document.querySelector(".alert").style.display = "block";
    document.querySelector("#notification").textContent = _text;
}

function notificationOff() {
    document.querySelector(".alert").style.display = "none";
}

window.addEventListener("load", async () => {
    notification("⌛ Loading...");
    await connectCeloWallet();
    await getBalance();
    await getTotalPriceOfNFTs();
    await getProducts();
    await getContractAddress();
    notificationOff();
});

document.querySelector("#newProductBtn").addEventListener("click", async () => {
    const name = document.getElementById("newProductName").value;
    const imageUrl = document.getElementById("newImgUrl").value;
    const description = document.getElementById("newProductDescription").value;
    const price = document.getElementById("newPrice").value;

    if (!name, !imageUrl, !description, !price) {
        notification("⚠️ Please fill in all fields in the form.");
        return;
    }

    const params = [
        name,
        imageUrl,
        description,
        // Create a bigNumber object so the contract can read it
        new BigNumber(price).shiftedBy(ERC20_DECIMALS).toString()
    ];
    notification(`⌛ Adding "${params[0]}"...`);

    contract.methods.writeProduct(...params).send({ from: kit.defaultAccount }).then(async (res) => {
        console.log(res);
        notification(`🎉 You successfully added "${params[0]}".`);
        await getProducts();
        await getTotalPriceOfNFTs();
    }).catch(err => {
        console.log(err);
        notification(`⚠️ ${error}.`);
    });
});

document.querySelector("#marketplace").addEventListener("click", async (e) => {
    if (e.target.className.includes("buyBtn")) {
        const index = e.target.id;

        // Approve payment
        notification("⌛ Waiting for payment approval...");
        try {
            await approve(products[index].price);
        } catch (error) {
            notification(`⚠️ ${error}.`);
        }

        // Do the payment
        notification(`⌛ Awaiting payment for "${products[index].name}"...`);
        try {
            const result = await contract.methods
                .buyProduct(index)
                .send({ from: kit.defaultAccount });
            notification(`🎉 You successfully bought "${products[index].name}".`);
            getProducts();
            getBalance();
        } catch (error) {
            notification(`⚠️ ${error}.`);
        }
    }
});
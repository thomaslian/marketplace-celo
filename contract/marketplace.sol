// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.9.0;

interface IERC20Token {
  function transfer(address, uint256) external returns (bool);
  function approve(address, uint256) external returns (bool);
  function transferFrom(address, address, uint256) external returns (bool);
  function totalSupply() external view returns (uint256);
  function balanceOf(address) external view returns (uint256);
  function allowance(address, address) external view returns (uint256);

  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract Marketplace {

    uint internal productsLength = 0;
    address internal cUsdTokenAddress = 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;

    struct Product {
        address payable owner;
        string name;
        string image;
        string description;
        uint price;
        uint prevPrice;
        bool sold;
    }

    mapping (uint => Product) internal products;

    function writeProduct(
        string memory _name,
        string memory _image,
        string memory _description,
        uint _prevPrice,
        uint _price
    ) public {
        bool _sold = false;
        products[productsLength] = Product(
            payable(msg.sender),
            _name,
            _image,
            _description,
            _price,
            _prevPrice,
            _sold
        );
        productsLength++;
    }

    function readProduct(uint _index) public view returns (
        address payable,
        string memory, 
        string memory, 
        string memory,
        uint, 
        uint,
        bool
    ) {
        return (
            products[_index].owner,
            products[_index].name, 
            products[_index].image, 
            products[_index].description, 
            products[_index].price,
            products[_index].prevPrice,
            products[_index].sold
        );
    }
    
    function buyProduct(uint _index) public payable  {
        require(
          IERC20Token(cUsdTokenAddress).transferFrom(
            msg.sender,
            products[_index].owner,
            products[_index].price
          ),
          "Transfer failed."
        );
        products[_index].sold = true;
        products[_index].prevPrice = products[_index].price;
    }
    
    function getProductsLength() public view returns (uint) {
        return (productsLength);
    }

    function getContractAddress() public view returns (address) {
        return (address(this));
    }

    function getTotalPriceOfNFTs() public view returns (uint) {
        uint _totalPrice = 0;
        if (productsLength > 0) {
            for (uint i = 0; i < productsLength; i++) {
                _totalPrice += products[i].price;
            }
        }
        return (_totalPrice);
    }
}
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

library SafeMath {
    /**
     * @dev Returns the addition of two unsigned integers, reverting on
     * overflow.
     *
     * Counterpart to Solidity's `+` operator.
     *
     * Requirements:
     *
     * - Addition cannot overflow.
     */
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, "SafeMath: addition overflow");

        return c;
    }

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

    mapping (uint => Product) public products;

    modifier onlyOwner(uint _index){
        require(products[_index].owner == msg.sender, "only the owner can call this function");
        _;
    }
    
    modifier isNotOwner(uint _index) {
      require(products[_index].owner != payable(msg.sender), "you can not buy NFT listed by you!");
    }
    
    function writeProduct(
        string memory _name,
        string memory _image,
        string memory _description,
        uint _price
    ) public {
        bool _sold = false;
        products[productsLength] = Product(
            payable(msg.sender),
            _name,
            _image,
            _description,
            _price,
            0,
            _sold
        );
        productsLength.add(1);
    }

      function edit(
          uint _index,
        string memory _name,
        string memory _image,
        string memory _description,
        uint _price
    ) onlyOwner(_index) public {
        products[_index].name = _name;
         products[_index].image = _image;
          products[_index].description = _description;
          
          products[_index].price = _price;

    }
    
    function buyProduct(uint _index) isNotOwner(_index) public payable  {
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

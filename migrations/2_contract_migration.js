const BlockDice65Turn3 = artifacts.require("BlockDice65Turn3");
//const BlockDiceAddress = '0xEbFefE3741461b4eE325c57D590BeB51bCd1e4Ba';//dev
const BlockDiceAddress = '0x4b5D49a47a2031724Ad990C4D74461BC94E3db42';//loom
module.exports = function(deployer) {
  deployer.deploy(BlockDice65Turn3, BlockDiceAddress);
};

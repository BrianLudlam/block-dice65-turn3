const truffleAssert = require('truffle-assertions');
const BlockDice65Turn3 = artifacts.require("BlockDice65Turn3");
const BlockDiceAddress = '0xEbFefE3741461b4eE325c57D590BeB51bCd1e4Ba';

const DICE_SIDES = 6;
const ROLL_COUNT = 5;
const VERIFY_BLOCKS = 1;

const BANK_COUNT = 6;
const BANK_ALL_FILTER = [5,5,5,5,5,5];
const BANK_NONE_FILTER = [0,0,0,0,0,0];

let dice;

const sleep = async (time) => {
  return new Promise(resolve => setTimeout(() => resolve(), time));
}

const consoleLog = (msg) => { console.log ('LOG >>> ', msg); }

const sleepUntilBlock = async (blockNumber) => {
  let _blockNumber = 0;
  while (_blockNumber <= blockNumber) {
    await sleep(1200);
    const block = await web3.eth.getBlock("latest");
    _blockNumber = block.number;
  }
}

contract("BlockDice65Turn3", (accounts) => {

  const owner = accounts[0];
  const alice = accounts[1];
  const aliceOp = accounts[2];
  const bob = accounts[3];

  beforeEach(async () => {
    dice = await BlockDice65Turn3.new(BlockDiceAddress, {from: owner});
  });

  afterEach(async () => {
    await dice.destroy({from: owner});
  });

  it("should allow single roll turn", async () => {
  	try{
  	  const key = web3.utils.soliditySha3 (Date.now());
  	  let tx = await dice.startTurn(web3.utils.soliditySha3(key), VERIFY_BLOCKS, {from: alice});
  	  //consoleLog(tx);
      truffleAssert.eventEmitted(tx, 'TurnStarted', (e) => (
    		e.account.toString() === alice
  	  ));

      await sleepUntilBlock(tx.receipt.blockNumber + VERIFY_BLOCKS);

  	  tx = await dice.continueTurn(key, web3.utils.soliditySha3(key), BANK_ALL_FILTER, {from: alice});
  	  truffleAssert.eventEmitted(tx, 'TurnEnded', (e) => (
    		e.account.toString() === alice && 
      	e.bank.length === BANK_COUNT && 
      	e.bank.reduce((total, each) => parseInt(total, 10) + parseInt(each, 10)) == ROLL_COUNT
    	  ));
  	} catch(e) {
      await dice.abortTurn({from: alice});
  	  assert(false);
  	  return;
  	}
  })

  it("should not allow starting more than one turn at once per account", async () => {
  	let key;
  	let tx;
  	try{
  	  key = web3.utils.soliditySha3 (Date.now());
  	  tx = await dice.startTurn(web3.utils.soliditySha3(key), VERIFY_BLOCKS, {from: alice});
  	  truffleAssert.eventEmitted(tx, 'TurnStarted', (e) => (
    		e.account.toString() === alice
  	  ));
    	  
  	  tx = await dice.startTurn(web3.utils.soliditySha3(key), {from: alice});
  	  assert(false);
  	} catch(e) {
      await dice.abortTurn({from: alice});
  	  assert(true);
  	}
	
  })

  it("should allow mutiple account turns at once", async () => {
	try{
	  let keyA = web3.utils.soliditySha3 (Date.now());
	  let tx = await dice.startTurn(web3.utils.soliditySha3(keyA), VERIFY_BLOCKS, {from: alice});
	  truffleAssert.eventEmitted(tx, 'TurnStarted', (e) => (
  		e.account.toString() === alice
  	  ));

	  let keyB = web3.utils.soliditySha3 (Date.now());
	  tx = await dice.startTurn(web3.utils.soliditySha3(keyB), VERIFY_BLOCKS, {from: owner});
	  truffleAssert.eventEmitted(tx, 'TurnStarted', (e) => (
  		e.account.toString() === owner
  	  ));

    await sleepUntilBlock(tx.receipt.blockNumber + VERIFY_BLOCKS);

	  tx = await dice.continueTurn(keyB, web3.utils.soliditySha3(keyA), BANK_ALL_FILTER, {from: owner});
	  truffleAssert.eventEmitted(tx, 'TurnEnded', (e) => (
  		e.account.toString() === owner && 
    	e.bank.length === BANK_COUNT && 
    	e.bank.reduce((total, each) => parseInt(total, 10) + parseInt(each, 10)) == ROLL_COUNT
  	  ));

  	  tx = await dice.continueTurn(keyA, web3.utils.soliditySha3(keyB), BANK_ALL_FILTER, {from: alice});
	  truffleAssert.eventEmitted(tx, 'TurnEnded', (e) => (
  		e.account.toString() === alice && 
    	e.bank.length === BANK_COUNT && 
    	e.bank.reduce((total, each) => parseInt(total, 10) + parseInt(each, 10)) == ROLL_COUNT
  	  ));
	} catch(e) {
    await dice.abortTurn({from: alice});
    await dice.abortTurn({from: owner});
	  assert(false, ''+e);
	  return;
	}
  })

  it("should allow double roll turn", async () => {
	try{
	  let keyA = web3.utils.soliditySha3 (Date.now());
	  let tx = await dice.startTurn(web3.utils.soliditySha3(keyA), VERIFY_BLOCKS, {from: alice});
	  truffleAssert.eventEmitted(tx, 'TurnStarted', (e) => (
  		e.account.toString() === alice
  	  ));

    await sleepUntilBlock(tx.receipt.blockNumber + VERIFY_BLOCKS);

	  let keyB = web3.utils.soliditySha3 (Date.now());
	  tx = await dice.continueTurn(keyA, web3.utils.soliditySha3(keyB), BANK_NONE_FILTER, {from: alice});
	  truffleAssert.eventEmitted(tx, 'TurnContinued', (e) => (
  		e.account.toString() === alice && 
    	e.bank.length === BANK_COUNT && 
    	e.bank.reduce((total, each) => parseInt(total, 10) + parseInt(each, 10)) == 0
	  ));

    await sleepUntilBlock(tx.receipt.blockNumber + VERIFY_BLOCKS);

	  keyA = web3.utils.soliditySha3 (Date.now());
	  tx = await dice.continueTurn(keyB, web3.utils.soliditySha3(keyA), BANK_ALL_FILTER, {from: alice});
	  truffleAssert.eventEmitted(tx, 'TurnEnded', (e) => (
  		e.account.toString() === alice && 
    	e.bank.length === BANK_COUNT && 
    	e.bank.reduce((total, each) => parseInt(total, 10) + parseInt(each, 10)) == ROLL_COUNT
	  ));
	} catch(e) {
    await dice.abortTurn({from: alice});
	  assert(false, ''+e);
	  return;
	}
  })

  it("should allow triple roll turn", async () => {
	try{
	  let keyA = web3.utils.soliditySha3 (Date.now());
	  let tx = await dice.startTurn(web3.utils.soliditySha3(keyA), VERIFY_BLOCKS, {from: alice});
	  truffleAssert.eventEmitted(tx, 'TurnStarted', (e) => (
  		e.account.toString() === alice
	  ));

    await sleepUntilBlock(tx.receipt.blockNumber + VERIFY_BLOCKS);

	  let keyB = web3.utils.soliditySha3 (Date.now());
	  tx = await dice.continueTurn(keyA, web3.utils.soliditySha3(keyB), BANK_NONE_FILTER, {from: alice});
	  truffleAssert.eventEmitted(tx, 'TurnContinued', (e) => (
  		e.account.toString() === alice && 
    	e.bank.length === BANK_COUNT && 
    	e.bank.reduce((total, each) => parseInt(total, 10) + parseInt(each, 10)) == 0
	  ));

    await sleepUntilBlock(tx.receipt.blockNumber + VERIFY_BLOCKS);

	  keyA = web3.utils.soliditySha3 (Date.now());
	  tx = await dice.continueTurn(keyB, web3.utils.soliditySha3(keyA), BANK_NONE_FILTER, {from: alice});
    truffleAssert.eventEmitted(tx, 'TurnContinued', (e) => (
  		e.account.toString() === alice && 
    	e.bank.length === BANK_COUNT && 
    	e.bank.reduce((total, each) => parseInt(total, 10) + parseInt(each, 10)) == 0
	  ));

    await sleepUntilBlock(tx.receipt.blockNumber + VERIFY_BLOCKS);

	  keyB = web3.utils.soliditySha3 (Date.now());
	  tx = await dice.continueTurn(keyA, web3.utils.soliditySha3(keyB), BANK_ALL_FILTER, {from: alice});
	  truffleAssert.eventEmitted(tx, 'TurnEnded', (e) => (
  		e.account.toString() === alice && 
    	e.bank.length === BANK_COUNT && 
    	e.bank.reduce((total, each) => parseInt(total, 10) + parseInt(each, 10)) == ROLL_COUNT
	  ));
	} catch(e) {
    await dice.abortTurn({from: alice});
	  assert(false, ''+e);
	  return;
	}
  })

  it("should not allow qaudruple roll turn", async () => {
    try{
      let keyA = web3.utils.soliditySha3 (Date.now());
      let tx = await dice.startTurn(web3.utils.soliditySha3(keyA), VERIFY_BLOCKS, {from: alice});
      truffleAssert.eventEmitted(tx, 'TurnStarted', (e) => (
    		e.account.toString() === alice
      ));

      await sleepUntilBlock(tx.receipt.blockNumber + VERIFY_BLOCKS);

      let keyB = web3.utils.soliditySha3 (Date.now());
      tx = await dice.continueTurn(keyA, web3.utils.soliditySha3(keyB), BANK_NONE_FILTER, {from: alice});
      truffleAssert.eventEmitted(tx, 'TurnContinued', (e) => (
    		e.account.toString() === alice && 
      	e.bank.length === BANK_COUNT && 
      	e.bank.reduce((total, each) => parseInt(total, 10) + parseInt(each, 10)) == 0
      ));

      await sleepUntilBlock(tx.receipt.blockNumber + VERIFY_BLOCKS);

      keyA = web3.utils.soliditySha3 (Date.now());
      tx = await dice.continueTurn(keyB, web3.utils.soliditySha3(keyA), BANK_NONE_FILTER, {from: alice});
      truffleAssert.eventEmitted(tx, 'TurnContinued', (e) => (
    		e.account.toString() === alice && 
      	e.bank.length === BANK_COUNT && 
      	e.bank.reduce((total, each) => parseInt(total, 10) + parseInt(each, 10)) == 0
      ));

      await sleepUntilBlock(tx.receipt.blockNumber + VERIFY_BLOCKS);

      keyB = web3.utils.soliditySha3 (Date.now());
      tx = await dice.continueTurn(keyA, web3.utils.soliditySha3(keyB), BANK_NONE_FILTER, {from: alice});
      truffleAssert.eventEmitted(tx, 'TurnEnded', (e) => (
    		e.account.toString() === alice && 
      	e.bank.length === BANK_COUNT && 
      	e.bank.reduce((total, each) => parseInt(total, 10) + parseInt(each, 10)) == ROLL_COUNT
  	  ));

      await sleepUntilBlock(tx.receipt.blockNumber + VERIFY_BLOCKS);

      keyA = web3.utils.soliditySha3 (Date.now());
      tx = await dice.continueTurn(keyB, web3.utils.soliditySha3(keyA), BANK_ALL_FILTER, {from: alice});
      assert(false);
      
    } catch(e) {
      assert(true);
      return;
    }
	
  })

});
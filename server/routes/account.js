const express = require('express');
const router = express.Router();
const Account = require('../models/Account');
const binanceService = require('../services/binanceService');
const logger = require('../utils/logger');

// Get account information
router.get('/', async (req, res) => {
  try {
    const { accountType } = req.query;
    
    const query = {};
    if (accountType) {
      query.accountType = accountType.toUpperCase();
    }

    const accounts = await Account.find(query);
    
    res.json({
      success: true,
      data: accounts
    });
  } catch (error) {
    logger.error('Error getting account info:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Get Binance account balance (real account)
router.get('/binance/balance', async (req, res) => {
  try {
    const balance = await binanceService.getBalance();
    const accountInfo = await binanceService.getAccountInfo();
    
    res.json({
      success: true,
      data: {
        balance,
        accountInfo
      }
    });
  } catch (error) {
    logger.error('Error getting Binance balance:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Create or reset account
router.post('/', async (req, res) => {
  try {
    const { accountType, initialBalance } = req.body;

    if (!accountType) {
      return res.status(400).json({ error: 'Account type is required' });
    }

    // Check if account exists
    let account = await Account.findOne({ accountType: accountType.toUpperCase() });

    if (account) {
      // Reset existing account
      account.balance = initialBalance || account.initialBalance;
      account.initialBalance = initialBalance || account.initialBalance;
      account.totalProfit = 0;
      account.totalLoss = 0;
      account.netProfit = 0;
      account.profitPercentage = 0;
      account.totalTrades = 0;
      account.winningTrades = 0;
      account.losingTrades = 0;
      account.winRate = 0;
      account.positions = [];
    } else {
      // Create new account
      let balance = initialBalance || 10000;
      if (accountType.toUpperCase() === 'REAL') {
        balance = await binanceService.getBalance();
      }

      account = new Account({
        accountType: accountType.toUpperCase(),
        balance,
        initialBalance: balance
      });
    }

    await account.save();

    logger.info(`Account ${accountType} created/reset`);

    res.json({
      success: true,
      data: account
    });
  } catch (error) {
    logger.error('Error creating account:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Update account balance (for simulated accounts)
router.put('/:id', async (req, res) => {
  try {
    const { balance } = req.body;

    const account = await Account.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    if (account.accountType === 'REAL') {
      return res.status(400).json({ 
        error: 'Cannot manually update real account balance' 
      });
    }

    if (balance !== undefined) {
      const diff = balance - account.balance;
      account.updateBalance(diff);
      await account.save();
    }

    res.json({
      success: true,
      data: account
    });
  } catch (error) {
    logger.error('Error updating account:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

module.exports = router;


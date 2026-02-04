// Blockchain API Routes
// Handles blockchain operations, smart contracts, and digital identity

const express = require('express');
const router = express.Router();
const rateLimiter = require('../middleware/rateLimiter');
const SmartContractManager = require('../blockchain/smartContract');
const DigitalIdentityManager = require('../blockchain/digitalIdentity');
const logger = require('../utils/logger');

// Initialize blockchain systems
const smartContractManager = new SmartContractManager();
const digitalIdentityManager = new DigitalIdentityManager();

// Middleware to check blockchain access
const checkBlockchainAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Check if organization has blockchain features enabled
  if (req.user.organization.subscriptionPlan !== 'enterprise') {
    return res.status(403).json({ error: 'Blockchain features require enterprise plan' });
  }
  
  next();
};

// Apply rate limiting to blockchain endpoints
router.use(rateLimiter.createBlockchainRateLimiter());

// Smart Contract Routes

// Create service on blockchain
router.post('/services/:serviceId/blockchain', checkBlockchainAccess, async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { Service } = require('../models');
    
    const service = await Service.findById(serviceId).populate('organization');
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    // Check if user has permission
    if (req.user.role !== 'ADMIN' && 
        req.user.organization.id !== service.organization.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const result = await smartContractManager.createServiceOnBlockchain({
      id: service.id,
      customerName: service.customerName,
      amount: service.amount,
      industry: service.industry,
      priority: service.priority,
      description: service.description,
      tags: service.tags || []
    });
    
    // Update service with blockchain reference
    await Service.findByIdAndUpdate(serviceId, {
      blockchainHash: result.serviceHash,
      blockchainCreatedAt: new Date()
    });
    
    res.json({
      success: true,
      result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error creating service on blockchain:', error);
    res.status(500).json({ error: error.message });
  }
});

// Complete service on blockchain
router.post('/services/:serviceId/blockchain/complete', checkBlockchainAccess, async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { completionData } = req.body;
    
    const { Service } = require('../models');
    const service = await Service.findById(serviceId);
    
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    if (!service.blockchainHash) {
      return res.status(400).json({ error: 'Service not on blockchain' });
    }
    
    // Check if user has permission
    if (req.user.role !== 'ADMIN' && 
        req.user.id !== service.assignedTo.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const result = await smartContractManager.completeServiceOnBlockchain(
      service.blockchainHash,
      {
        completedBy: req.user.id,
        notes: completionData.notes,
        actualDuration: completionData.actualDuration,
        satisfaction: completionData.satisfaction
      }
    );
    
    // Update service completion
    await Service.findByIdAndUpdate(serviceId, {
      status: 'completed',
      blockchainCompletedAt: new Date(),
      completedAt: new Date()
    });
    
    res.json({
      success: true,
      result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error completing service on blockchain:', error);
    res.status(500).json({ error: error.message });
  }
});

// Process payment on blockchain
router.post('/services/:serviceId/blockchain/payment', checkBlockchainAccess, async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { amount } = req.body;
    
    const { Service } = require('../models');
    const service = await Service.findById(serviceId);
    
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    if (!service.blockchainHash) {
      return res.status(400).json({ error: 'Service not on blockchain' });
    }
    
    // Check if user has permission (customer or admin)
    if (req.user.role !== 'ADMIN' && 
        req.user.id !== service.createdBy.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const result = await smartContractManager.processPaymentOnBlockchain(
      service.blockchainHash,
      amount
    );
    
    res.json({
      success: true,
      result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error processing payment on blockchain:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create escrow
router.post('/services/:serviceId/blockchain/escrow', checkBlockchainAccess, async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { amount, conditions } = req.body;
    
    const { Service, User } = require('../models');
    const service = await Service.findById(serviceId).populate('assignedTo');
    
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    if (!service.blockchainHash) {
      return res.status(400).json({ error: 'Service not on blockchain' });
    }
    
    // Check if user has permission
    if (req.user.role !== 'ADMIN' && 
        req.user.id !== service.createdBy.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const provider = service.assignedTo;
    if (!provider) {
      return res.status(400).json({ error: 'Service not assigned to provider' });
    }
    
    const result = await smartContractManager.createEscrow(
      service.blockchainHash,
      amount,
      provider.blockchainAddress || provider.ethereumAddress,
      req.user.blockchainAddress || req.user.ethereumAddress,
      conditions || {}
    );
    
    // Update service with escrow information
    await Service.findByIdAndUpdate(serviceId, {
      escrowId: result.escrowId,
      escrowAmount: amount,
      escrowStatus: 'active'
    });
    
    res.json({
      success: true,
      result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error creating escrow:', error);
    res.status(500).json({ error: error.message });
  }
});

// Release escrow
router.post('/escrow/:escrowId/release', checkBlockchainAccess, async (req, res) => {
  try {
    const { escrowId } = req.params;
    const { releaseToProvider = true } = req.body;
    
    // Check if user has permission (admin or escrow participant)
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const result = await smartContractManager.releaseEscrow(escrowId, releaseToProvider);
    
    res.json({
      success: true,
      result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error releasing escrow:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mint service NFT
router.post('/services/:serviceId/blockchain/nft', checkBlockchainAccess, async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { tokenURI, recipientAddress } = req.body;
    
    const { Service } = require('../models');
    const service = await Service.findById(serviceId);
    
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    if (!service.blockchainHash) {
      return res.status(400).json({ error: 'Service not on blockchain' });
    }
    
    // Check if user has permission
    if (req.user.role !== 'ADMIN' && 
        req.user.id !== service.createdBy.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const result = await smartContractManager.mintServiceNFT(
      service.blockchainHash,
      tokenURI,
      recipientAddress
    );
    
    // Update service with NFT information
    await Service.findByIdAndUpdate(serviceId, {
      nftTokenId: result.tokenId,
      nftTokenURI: tokenURI,
      nftMintedAt: new Date()
    });
    
    res.json({
      success: true,
      result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error minting service NFT:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get service from blockchain
router.get('/services/:serviceHash/blockchain', checkBlockchainAccess, async (req, res) => {
  try {
    const { serviceHash } = req.params;
    
    const service = await smartContractManager.getServiceFromBlockchain(serviceHash);
    const history = await smartContractManager.getServiceHistory(serviceHash);
    
    res.json({
      success: true,
      service,
      history,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting service from blockchain:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get escrow details
router.get('/escrow/:escrowId', checkBlockchainAccess, async (req, res) => {
  try {
    const { escrowId } = req.params;
    
    const escrow = await smartContractManager.getEscrowDetails(escrowId);
    
    res.json({
      success: true,
      escrow,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting escrow details:', error);
    res.status(500).json({ error: error.message });
  }
});

// Digital Identity Routes

// Create DID
router.post('/identity/did', checkBlockchainAccess, async (req, res) => {
  try {
    const { type = 'user' } = req.body;
    
    let entity;
    if (type === 'user') {
      entity = req.user;
    } else if (type === 'organization') {
      entity = req.user.organization;
    } else {
      return res.status(400).json({ error: 'Invalid identity type' });
    }
    
    if (entity.did) {
      return res.status(400).json({ error: 'DID already exists' });
    }
    
    const result = await digitalIdentityManager.createDID(entity, type);
    
    res.json({
      success: true,
      result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error creating DID:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get DID document
router.get('/identity/did/:did', checkBlockchainAccess, async (req, res) => {
  try {
    const { did } = req.params;
    
    const document = await digitalIdentityManager.getDIDDocument(did);
    
    res.json({
      success: true,
      document,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting DID document:', error);
    res.status(500).json({ error: error.message });
  }
});

// Resolve DID
router.get('/identity/resolve/:did', checkBlockchainAccess, async (req, res) => {
  try {
    const { did } = req.params;
    
    const result = await digitalIdentityManager.resolveDID(did);
    
    res.json({
      success: true,
      result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error resolving DID:', error);
    res.status(500).json({ error: error.message });
  }
});

// Issue credential
router.post('/identity/credentials/issue', checkBlockchainAccess, async (req, res) => {
  try {
    const { subjectDID, credentialType, claims, expiration } = req.body;
    
    // Get issuer DID
    const issuerDID = req.user.did || req.user.organization.did;
    if (!issuerDID) {
      return res.status(400).json({ error: 'Issuer DID not found' });
    }
    
    const credential = await digitalIdentityManager.issueCredential(
      issuerDID,
      subjectDID,
      credentialType,
      claims,
      expiration
    );
    
    res.json({
      success: true,
      credential,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error issuing credential:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify credential
router.post('/identity/credentials/verify', checkBlockchainAccess, async (req, res) => {
  try {
    const { credential } = req.body;
    
    const verification = await digitalIdentityManager.verifyCredential(credential);
    
    res.json({
      success: true,
      verification,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error verifying credential:', error);
    res.status(500).json({ error: error.message });
  }
});

// Revoke credential
router.post('/identity/credentials/:credentialId/revoke', checkBlockchainAccess, async (req, res) => {
  try {
    const { credentialId } = req.params;
    
    const issuerDID = req.user.did || req.user.organization.did;
    if (!issuerDID) {
      return res.status(400).json({ error: 'Issuer DID not found' });
    }
    
    const result = await digitalIdentityManager.revokeCredential(credentialId, issuerDID);
    
    res.json({
      success: true,
      result,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error revoking credential:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create presentation
router.post('/identity/presentations', checkBlockchainAccess, async (req, res) => {
  try {
    const { credentials, challenge } = req.body;
    
    const holderDID = req.user.did || req.user.organization.did;
    if (!holderDID) {
      return res.status(400).json({ error: 'Holder DID not found' });
    }
    
    const presentation = await digitalIdentityManager.createPresentation(
      credentials,
      holderDID,
      challenge
    );
    
    res.json({
      success: true,
      presentation,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error creating presentation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify presentation
router.post('/identity/presentations/verify', checkBlockchainAccess, async (req, res) => {
  try {
    const { presentation } = req.body;
    
    const verification = await digitalIdentityManager.verifyPresentation(presentation);
    
    res.json({
      success: true,
      verification,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error verifying presentation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user credentials
router.get('/identity/credentials', checkBlockchainAccess, async (req, res) => {
  try {
    const { type } = req.query;
    
    const did = req.user.did || req.user.organization.did;
    if (!did) {
      return res.status(400).json({ error: 'DID not found' });
    }
    
    const credentials = await digitalIdentityManager.getUserCredentials(did, type);
    
    res.json({
      success: true,
      credentials,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting user credentials:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create service credential
router.post('/identity/credentials/service', checkBlockchainAccess, async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { Service } = require('../models');
    
    const service = await Service.findById(serviceId).populate('organization assignedTo');
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    // Check if user has permission
    if (req.user.role !== 'ADMIN' && 
        req.user.organization.id !== service.organization.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const credential = await digitalIdentityManager.createServiceCredential(
      service.assignedTo.did,
      service
    );
    
    res.json({
      success: true,
      credential,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error creating service credential:', error);
    res.status(500).json({ error: error.message });
  }
});

// Blockchain Analytics Routes (Admin only)

// Get blockchain analytics
router.get('/analytics', async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { timeRange = '30d' } = req.query;
    
    const analytics = {
      blockchain: {
        network: smartContractManager.network?.name || 'unknown',
        contractAddress: smartContractManager.contractAddress,
        totalTransactions: await this.getTotalTransactions(),
        averageGasPrice: await smartContractManager.getGasPrice(),
        walletBalance: await smartContractManager.getBalance(smartContractManager.wallet.address)
      },
      services: {
        totalOnBlockchain: await this.getTotalServicesOnBlockchain(),
        completedOnBlockchain: await this.getCompletedServicesOnBlockchain(),
        totalValue: await this.getTotalServiceValue(),
        averageCompletionTime: await this.getAverageCompletionTime()
      },
      escrow: {
        totalEscrows: await this.getTotalEscrows(),
        activeEscrows: await this.getActiveEscrows(),
        totalValue: await this.getTotalEscrowValue(),
        averageReleaseTime: await this.getAverageReleaseTime()
      },
      nfts: {
        totalMinted: await this.getTotalNFTsMinted(),
        totalOwners: await this.getTotalNFTOwners(),
        averageValue: await this.getAverageNFTValue()
      },
      identity: {
        totalDIDs: digitalIdentityManager.didRegistry.size,
        totalCredentials: digitalIdentityManager.credentials.size,
        activeCredentials: Array.from(digitalIdentityManager.credentials.values())
          .filter(cred => cred.status === 'active').length
      }
    };
    
    res.json({
      success: true,
      analytics,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting blockchain analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
router.get('/health', async (req, res) => {
  try {
    const health = {
      smartContractManager: !!smartContractManager.contract,
      digitalIdentityManager: digitalIdentityManager.didRegistry.size > 0,
      blockchain: !!smartContractManager.provider,
      timestamp: new Date()
    };
    
    const isHealthy = Object.values(health).every(status => 
      typeof status === 'boolean' ? status : true
    );
    
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      ...health
    });
  } catch (error) {
    logger.error('Error in blockchain health check:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed'
    });
  }
});

// Helper functions for analytics
async function getTotalTransactions() {
  // Calculate total blockchain transactions
  return 0; // Placeholder
}

async function getTotalServicesOnBlockchain() {
  const { Service } = require('../models');
  return await Service.countDocuments({ blockchainHash: { $exists: true } });
}

async function getCompletedServicesOnBlockchain() {
  const { Service } = require('../models');
  return await Service.countDocuments({ 
    blockchainHash: { $exists: true },
    status: 'completed'
  });
}

async function getTotalServiceValue() {
  const { Service } = require('../models');
  const result = await Service.aggregate([
    { $match: { blockchainHash: { $exists: true } } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  return result[0]?.total || 0;
}

async function getAverageCompletionTime() {
  // Calculate average completion time for blockchain services
  return 0; // Placeholder
}

async function getTotalEscrows() {
  const { Service } = require('../models');
  return await Service.countDocuments({ escrowId: { $exists: true } });
}

async function getActiveEscrows() {
  const { Service } = require('../models');
  return await Service.countDocuments({ 
    escrowId: { $exists: true },
    escrowStatus: 'active'
  });
}

async function getTotalEscrowValue() {
  const { Service } = require('../models');
  const result = await Service.aggregate([
    { $match: { escrowId: { $exists: true } } },
    { $group: { _id: null, total: { $sum: '$escrowAmount' } } }
  ]);
  return result[0]?.total || 0;
}

async function getAverageReleaseTime() {
  // Calculate average escrow release time
  return 0; // Placeholder
}

async function getTotalNFTsMinted() {
  const { Service } = require('../models');
  return await Service.countDocuments({ nftTokenId: { $exists: true } });
}

async function getTotalNFTOwners() {
  // Calculate total unique NFT owners
  return 0; // Placeholder
}

async function getAverageNFTValue() {
  // Calculate average NFT value
  return 0; // Placeholder
}

// Graceful shutdown
const shutdown = async () => {
  try {
    await Promise.all([
      smartContractManager.cleanup(),
      digitalIdentityManager.cleanup()
    ]);
    
    logger.info('🔌 Blockchain systems shut down gracefully');
  } catch (error) {
    logger.error('Error shutting down Blockchain systems:', error);
  }
};

module.exports = {
  router,
  shutdown
};

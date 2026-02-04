// Smart Contract Integration for ServiceNexus
// Ethereum smart contract interactions and blockchain operations

const { ethers } = require('ethers');
const logger = require('../utils/logger');
const { Service, User, Organization } = require('../models');

class SmartContractManager {
  constructor() {
    this.provider = null;
    this.contract = null;
    this.signer = null;
    this.wallet = null;
    this.network = null;
    this.gasPrice = null;
    this.contractAddress = null;
    this.abi = null;
    
    this.initialize();
  }

  async initialize() {
    try {
      logger.info('🔗 Initializing Smart Contract Manager...');
      
      // Initialize blockchain connection
      await this.initializeBlockchain();
      
      // Load contract ABI
      await this.loadContractABI();
      
      // Setup wallet and signer
      await this.setupWallet();
      
      // Connect to contract
      await this.connectToContract();
      
      logger.info('✅ Smart Contract Manager initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize Smart Contract Manager:', error);
    }
  }

  // Initialize blockchain connection
  async initializeBlockchain() {
    try {
      const network = process.env.BLOCKCHAIN_NETWORK || 'sepolia';
      const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_PROJECT_ID';
      
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.network = await this.provider.getNetwork();
      
      logger.info(`🌐 Connected to blockchain network: ${this.network.name} (${this.network.chainId})`);
    } catch (error) {
      logger.error('Error initializing blockchain:', error);
      throw error;
    }
  }

  // Setup wallet and signer
  async setupWallet() {
    try {
      const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
      if (!privateKey) {
        throw new Error('Blockchain private key not configured');
      }
      
      this.wallet = new ethers.Wallet(privateKey, this.provider);
      this.signer = this.wallet;
      
      logger.info(`👛 Wallet setup: ${this.wallet.address}`);
    } catch (error) {
      logger.error('Error setting up wallet:', error);
      throw error;
    }
  }

  // Load contract ABI
  async loadContractABI() {
    try {
      // ServiceNexus smart contract ABI
      this.abi = [
        // Service creation
        {
          "inputs": [
            {"name": "serviceId", "type": "string"},
            {"name": "customerName", "type": "string"},
            {"name": "amount", "type": "uint256"},
            {"name": "provider", "type": "address"},
            {"name": "metadata", "type": "string"}
          ],
          "name": "createService",
          "outputs": [{"name": "serviceHash", "type": "bytes32"}],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        
        // Service completion
        {
          "inputs": [
            {"name": "serviceHash", "type": "bytes32"},
            {"name": "completionData", "type": "string"},
            {"name": "timestamp", "type": "uint256"}
          ],
          "name": "completeService",
          "outputs": [{"name": "success", "type": "bool"}],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        
        // Payment processing
        {
          "inputs": [
            {"name": "serviceHash", "type": "bytes32"},
            {"name": "amount", "type": "uint256"}
          ],
          "name": "processPayment",
          "outputs": [{"name": "success", "type": "bool"}],
          "stateMutability": "payable",
          "type": "function"
        },
        
        // Get service details
        {
          "inputs": [{"name": "serviceHash", "type": "bytes32"}],
          "name": "getService",
          "outputs": [
            {"name": "serviceId", "type": "string"},
            {"name": "customerName", "type": "string"},
            {"name": "amount", "type": "uint256"},
            {"name": "provider", "type": "address"},
            {"name": "status", "type": "uint8"},
            {"name": "createdAt", "type": "uint256"},
            {"name": "completedAt", "type": "uint256"},
            {"name": "metadata", "type": "string"}
          ],
          "stateMutability": "view",
          "type": "function"
        },
        
        // Get service history
        {
          "inputs": [{"name": "serviceHash", "type": "bytes32"}],
          "name": "getServiceHistory",
          "outputs": [
            {
              "components": [
                {"name": "action", "type": "string"},
                {"name": "actor", "type": "address"},
                {"name": "timestamp", "type": "uint256"},
                {"name": "data", "type": "string"}
              ],
              "name": "events",
              "type": "tuple[]"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        
        // Create escrow
        {
          "inputs": [
            {"name": "serviceHash", "type": "bytes32"},
            {"name": "amount", "type": "uint256"},
            {"name": "provider", "type": "address"},
            {"name": "customer", "type": "address"},
            {"name": "conditions", "type": "string"}
          ],
          "name": "createEscrow",
          "outputs": [{"name": "escrowId", "type": "uint256"}],
          "stateMutability": "payable",
          "type": "function"
        },
        
        // Release escrow
        {
          "inputs": [
            {"name": "escrowId", "type": "uint256"},
            {"name": "releaseToProvider", "type": "bool"}
          ],
          "name": "releaseEscrow",
          "outputs": [{"name": "success", "type": "bool"}],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        
        // Get escrow details
        {
          "inputs": [{"name": "escrowId", "type": "uint256"}],
          "name": "getEscrow",
          "outputs": [
            {"name": "serviceHash", "type": "bytes32"},
            {"name": "amount", "type": "uint256"},
            {"name": "provider", "type": "address"},
            {"name": "customer", "type": "address"},
            {"name": "status", "type": "uint8"},
            {"name": "createdAt", "type": "uint256"},
            {"name": "releasedAt", "type": "uint256"},
            {"name": "conditions", "type": "string"}
          ],
          "stateMutability": "view",
          "type": "function"
        },
        
        // Create NFT for service
        {
          "inputs": [
            {"name": "serviceHash", "type": "bytes32"},
            {"name": "tokenURI", "type": "string"},
            {"name": "recipient", "type": "address"}
          ],
          "name": "mintServiceNFT",
          "outputs": [{"name": "tokenId", "type": "uint256"}],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        
        // Transfer NFT
        {
          "inputs": [
            {"name": "tokenId", "type": "uint256"},
            {"name": "to", "type": "address"}
          ],
          "name": "transferNFT",
          "outputs": [{"name": "success", "type": "bool"}],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        
        // Events
        {
          "anonymous": false,
          "inputs": [
            {"indexed": true, "name": "serviceHash", "type": "bytes32"},
            {"indexed": true, "name": "serviceId", "type": "string"},
            {"indexed": false, "name": "provider", "type": "address"},
            {"indexed": false, "name": "timestamp", "type": "uint256"}
          ],
          "name": "ServiceCreated",
          "type": "event"
        },
        
        {
          "anonymous": false,
          "inputs": [
            {"indexed": true, "name": "serviceHash", "type": "bytes32"},
            {"indexed": false, "name": "completionData", "type": "string"},
            {"indexed": false, "name": "timestamp", "type": "uint256"}
          ],
          "name": "ServiceCompleted",
          "type": "event"
        },
        
        {
          "anonymous": false,
          "inputs": [
            {"indexed": true, "name": "serviceHash", "type": "bytes32"},
            {"indexed": false, "name": "amount", "type": "uint256"},
            {"indexed": false, "name": "from", "type": "address"}
          ],
          "name": "PaymentProcessed",
          "type": "event"
        },
        
        {
          "anonymous": false,
          "inputs": [
            {"indexed": true, "name": "escrowId", "type": "uint256"},
            {"indexed": true, "name": "serviceHash", "type": "bytes32"},
            {"indexed": false, "name": "amount", "type": "uint256"}
          ],
          "name": "EscrowCreated",
          "type": "event"
        },
        
        {
          "anonymous": false,
          "inputs": [
            {"indexed": true, "name": "escrowId", "type": "uint256"},
            {"indexed": false, "name": "releasedTo", "type": "address"},
            {"indexed": false, "name": "amount", "type": "uint256"}
          ],
          "name": "EscrowReleased",
          "type": "event"
        }
      ];
      
      logger.info('📜 Contract ABI loaded');
    } catch (error) {
      logger.error('Error loading contract ABI:', error);
      throw error;
    }
  }

  // Connect to smart contract
  async connectToContract() {
    try {
      this.contractAddress = process.env.SERVICE_NEXUS_CONTRACT_ADDRESS;
      
      if (!this.contractAddress) {
        throw new Error('ServiceNexus contract address not configured');
      }
      
      this.contract = new ethers.Contract(this.contractAddress, this.abi, this.signer);
      
      // Test connection
      const network = await this.provider.getNetwork();
      logger.info(`🔗 Connected to contract at ${this.contractAddress} on ${network.name}`);
    } catch (error) {
      logger.error('Error connecting to contract:', error);
      throw error;
    }
  }

  // Create service on blockchain
  async createServiceOnBlockchain(serviceData) {
    try {
      const serviceHash = ethers.keccak256(
        ethers.toUtf8Bytes(`${serviceData.id}-${serviceData.customerName}-${Date.now()}`)
      );
      
      const metadata = JSON.stringify({
        serviceId: serviceData.id,
        industry: serviceData.industry,
        priority: serviceData.priority,
        description: serviceData.description,
        tags: serviceData.tags || []
      });
      
      const tx = await this.contract.createService(
        serviceData.id,
        serviceData.customerName,
        ethers.parseEther(serviceData.amount.toString()),
        this.wallet.address,
        metadata
      );
      
      const receipt = await tx.wait();
      
      logger.info(`🔗 Service created on blockchain: ${serviceHash}`);
      
      return {
        serviceHash,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      logger.error('Error creating service on blockchain:', error);
      throw error;
    }
  }

  // Complete service on blockchain
  async completeServiceOnBlockchain(serviceHash, completionData) {
    try {
      const metadata = JSON.stringify({
        completedBy: completionData.completedBy,
        completionNotes: completionData.notes || '',
        actualDuration: completionData.actualDuration || 0,
        satisfaction: completionData.satisfaction || 5
      });
      
      const tx = await this.contract.completeService(
        serviceHash,
        metadata,
        Math.floor(Date.now() / 1000)
      );
      
      const receipt = await tx.wait();
      
      logger.info(`✅ Service completed on blockchain: ${serviceHash}`);
      
      return {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      logger.error('Error completing service on blockchain:', error);
      throw error;
    }
  }

  // Process payment on blockchain
  async processPaymentOnBlockchain(serviceHash, amount) {
    try {
      const tx = await this.contract.processPayment(
        serviceHash,
        ethers.parseEther(amount.toString()),
        {
          value: ethers.parseEther(amount.toString())
        }
      );
      
      const receipt = await tx.wait();
      
      logger.info(`💳 Payment processed on blockchain: ${serviceHash} - ${amount} ETH`);
      
      return {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      logger.error('Error processing payment on blockchain:', error);
      throw error;
    }
  }

  // Create escrow for service
  async createEscrow(serviceHash, amount, providerAddress, customerAddress, conditions) {
    try {
      const conditionsStr = JSON.stringify(conditions);
      
      const tx = await this.contract.createEscrow(
        serviceHash,
        ethers.parseEther(amount.toString()),
        providerAddress,
        customerAddress,
        conditionsStr,
        {
          value: ethers.parseEther(amount.toString())
        }
      );
      
      const receipt = await tx.wait();
      
      // Parse escrow ID from event
      const event = receipt.logs.find(log => {
        try {
          const parsedLog = this.contract.interface.parseLog(log);
          return parsedLog.name === 'EscrowCreated';
        } catch {
          return false;
        }
      });
      
      const escrowId = event ? this.contract.interface.parseLog(event).args.escrowId : null;
      
      logger.info(`🔒 Escrow created: ${escrowId} for service ${serviceHash}`);
      
      return {
        escrowId: escrowId.toString(),
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      logger.error('Error creating escrow:', error);
      throw error;
    }
  }

  // Release escrow
  async releaseEscrow(escrowId, releaseToProvider = true) {
    try {
      const tx = await this.contract.releaseEscrow(escrowId, releaseToProvider);
      const receipt = await tx.wait();
      
      logger.info(`💰 Escrow released: ${escrowId} to ${releaseToProvider ? 'provider' : 'customer'}`);
      
      return {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      logger.error('Error releasing escrow:', error);
      throw error;
    }
  }

  // Mint service NFT
  async mintServiceNFT(serviceHash, tokenURI, recipientAddress) {
    try {
      const tx = await this.contract.mintServiceNFT(
        serviceHash,
        tokenURI,
        recipientAddress
      );
      
      const receipt = await tx.wait();
      
      // Parse token ID from event
      const event = receipt.logs.find(log => {
        try {
          const parsedLog = this.contract.interface.parseLog(log);
          return parsedLog.name === 'Transfer';
        } catch {
          return false;
        }
      });
      
      const tokenId = event ? this.contract.interface.parseLog(event).args.tokenId : null;
      
      logger.info(`🎨 Service NFT minted: ${tokenId} for service ${serviceHash}`);
      
      return {
        tokenId: tokenId.toString(),
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      logger.error('Error minting service NFT:', error);
      throw error;
    }
  }

  // Get service details from blockchain
  async getServiceFromBlockchain(serviceHash) {
    try {
      const service = await this.contract.getService(serviceHash);
      
      return {
        serviceId: service[0],
        customerName: service[1],
        amount: ethers.formatEther(service[2]),
        provider: service[3],
        status: service[4],
        createdAt: new Date(service[5].toNumber() * 1000),
        completedAt: service[6].toNumber() > 0 ? new Date(service[6].toNumber() * 1000) : null,
        metadata: JSON.parse(service[7])
      };
    } catch (error) {
      logger.error('Error getting service from blockchain:', error);
      throw error;
    }
  }

  // Get service history from blockchain
  async getServiceHistory(serviceHash) {
    try {
      const history = await this.contract.getServiceHistory(serviceHash);
      
      return history.map(event => ({
        action: event[0],
        actor: event[1],
        timestamp: new Date(event[2].toNumber() * 1000),
        data: JSON.parse(event[3])
      }));
    } catch (error) {
      logger.error('Error getting service history from blockchain:', error);
      throw error;
    }
  }

  // Get escrow details
  async getEscrowDetails(escrowId) {
    try {
      const escrow = await this.contract.getEscrow(escrowId);
      
      return {
        serviceHash: escrow[0],
        amount: ethers.formatEther(escrow[1]),
        provider: escrow[2],
        customer: escrow[3],
        status: escrow[4],
        createdAt: new Date(escrow[5].toNumber() * 1000),
        releasedAt: escrow[6].toNumber() > 0 ? new Date(escrow[6].toNumber() * 1000) : null,
        conditions: JSON.parse(escrow[7])
      };
    } catch (error) {
      logger.error('Error getting escrow details:', error);
      throw error;
    }
  }

  // Monitor blockchain events
  async monitorEvents() {
    try {
      // Listen for service creation events
      this.contract.on('ServiceCreated', (serviceHash, serviceId, provider, timestamp) => {
        logger.info(`🔗 ServiceCreated event: ${serviceId} by ${provider}`);
        
        // Handle service creation event
        this.handleServiceCreatedEvent(serviceHash, serviceId, provider, timestamp);
      });
      
      // Listen for service completion events
      this.contract.on('ServiceCompleted', (serviceHash, completionData, timestamp) => {
        logger.info(`✅ ServiceCompleted event: ${serviceHash}`);
        
        // Handle service completion event
        this.handleServiceCompletedEvent(serviceHash, completionData, timestamp);
      });
      
      // Listen for payment events
      this.contract.on('PaymentProcessed', (serviceHash, amount, from) => {
        logger.info(`💳 PaymentProcessed event: ${ethers.formatEther(amount)} ETH from ${from}`);
        
        // Handle payment event
        this.handlePaymentProcessedEvent(serviceHash, amount, from);
      });
      
      // Listen for escrow events
      this.contract.on('EscrowCreated', (escrowId, serviceHash, amount) => {
        logger.info(`🔒 EscrowCreated event: ${escrowId} - ${ethers.formatEther(amount)} ETH`);
        
        // Handle escrow creation event
        this.handleEscrowCreatedEvent(escrowId, serviceHash, amount);
      });
      
      this.contract.on('EscrowReleased', (escrowId, releasedTo, amount) => {
        logger.info(`💰 EscrowReleased event: ${escrowId} - ${ethers.formatEther(amount)} ETH to ${releasedTo}`);
        
        // Handle escrow release event
        this.handleEscrowReleasedEvent(escrowId, releasedTo, amount);
      });
      
      logger.info('👂 Blockchain event monitoring started');
    } catch (error) {
      logger.error('Error setting up event monitoring:', error);
    }
  }

  // Event handlers
  async handleServiceCreatedEvent(serviceHash, serviceId, provider, timestamp) {
    try {
      // Update database with blockchain reference
      await Service.findOneAndUpdate(
        { id: serviceId },
        { 
          blockchainHash: serviceHash,
          blockchainProvider: provider,
          blockchainCreatedAt: new Date(timestamp.toNumber() * 1000)
        }
      );
      
      logger.info(`📝 Service ${serviceId} updated with blockchain reference`);
    } catch (error) {
      logger.error('Error handling ServiceCreated event:', error);
    }
  }

  async handleServiceCompletedEvent(serviceHash, completionData, timestamp) {
    try {
      const data = JSON.parse(completionData);
      
      // Update service completion in database
      await Service.findOneAndUpdate(
        { blockchainHash: serviceHash },
        { 
          status: 'completed',
          blockchainCompletedAt: new Date(timestamp.toNumber() * 1000),
          blockchainCompletionData: data
        }
      );
      
      logger.info(`✅ Service completion updated from blockchain`);
    } catch (error) {
      logger.error('Error handling ServiceCompleted event:', error);
    }
  }

  async handlePaymentProcessedEvent(serviceHash, amount, from) {
    try {
      const service = await Service.findOne({ blockchainHash: serviceHash });
      
      if (service) {
        // Create payment record
        const payment = {
          serviceId: service.id,
          amount: ethers.formatEther(amount),
          from: from,
          blockchainHash: serviceHash,
          timestamp: new Date(),
          status: 'confirmed'
        };
        
        logger.info(`💳 Payment recorded for service ${service.id}: ${payment.amount} ETH`);
      }
    } catch (error) {
      logger.error('Error handling PaymentProcessed event:', error);
    }
  }

  async handleEscrowCreatedEvent(escrowId, serviceHash, amount) {
    try {
      const service = await Service.findOne({ blockchainHash: serviceHash });
      
      if (service) {
        // Update service with escrow information
        await Service.findOneAndUpdate(
          { id: service.id },
          { 
            escrowId: escrowId.toString(),
            escrowAmount: ethers.formatEther(amount),
            escrowStatus: 'active'
          }
        );
        
        logger.info(`🔒 Escrow created for service ${service.id}: ${escrowId}`);
      }
    } catch (error) {
      logger.error('Error handling EscrowCreated event:', error);
    }
  }

  async handleEscrowReleasedEvent(escrowId, releasedTo, amount) {
    try {
      // Update escrow status in database
      await Service.findOneAndUpdate(
        { escrowId: escrowId.toString() },
        { 
          escrowStatus: 'released',
          escrowReleasedAt: new Date(),
          escrowReleasedTo: releasedTo
        }
      );
      
      logger.info(`💰 Escrow released: ${escrowId} to ${releasedTo}`);
    } catch (error) {
      logger.error('Error handling EscrowReleased event:', error);
    }
  }

  // Utility methods
  async getGasPrice() {
    try {
      const gasPrice = await this.provider.getFeeData();
      this.gasPrice = gasPrice.gasPrice;
      return this.gasPrice;
    } catch (error) {
      logger.error('Error getting gas price:', error);
      return ethers.parseUnits('20', 'gwei'); // Fallback
    }
  }

  async getBalance(address) {
    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      logger.error('Error getting balance:', error);
      return '0';
    }
  }

  async getTransactionStatus(transactionHash) {
    try {
      const receipt = await this.provider.getTransactionReceipt(transactionHash);
      return {
        status: receipt.status,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        confirmations: await this.provider.getBlockNumber() - receipt.blockNumber
      };
    } catch (error) {
      logger.error('Error getting transaction status:', error);
      return null;
    }
  }

  // Cleanup
  async cleanup() {
    try {
      if (this.contract) {
        this.contract.removeAllListeners();
      }
      
      this.provider = null;
      this.contract = null;
      this.signer = null;
      this.wallet = null;
      
      logger.info('🧹 Smart Contract Manager cleaned up');
    } catch (error) {
      logger.error('Error cleaning up Smart Contract Manager:', error);
    }
  }
}

module.exports = SmartContractManager;

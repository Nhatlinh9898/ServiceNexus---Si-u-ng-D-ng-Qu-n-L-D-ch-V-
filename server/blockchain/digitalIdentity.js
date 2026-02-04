// Digital Identity Management for ServiceNexus
// Decentralized identity (DID) and verifiable credentials

const { ethers } = require('ethers');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { User, Organization } = require('../models');

class DigitalIdentityManager {
  constructor() {
    this.didRegistry = new Map();
    this.credentials = new Map();
    this.verifiers = new Map();
    this.proofs = new Map();
    
    this.initialize();
  }

  async initialize() {
    try {
      logger.info('🆔 Initializing Digital Identity Manager...');
      
      // Initialize DID registry
      await this.initializeDIDRegistry();
      
      // Setup verifiers
      await this.setupVerifiers();
      
      logger.info('✅ Digital Identity Manager initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize Digital Identity Manager:', error);
    }
  }

  // Create Decentralized Identity (DID)
  async createDID(userOrOrg, type = 'user') {
    try {
      const did = this.generateDID(userOrOrg, type);
      const keyPair = this.generateKeyPair();
      
      const didDocument = {
        '@context': ['https://www.w3.org/ns/did/v1'],
        id: did,
        verificationMethod: [{
          id: `${did}#keys-1`,
          type: 'Ed25519VerificationKey2018',
          controller: did,
          publicKeyBase58: keyPair.publicKey
        }],
        authentication: [`${did}#keys-1`],
        service: [{
          id: `${did}#service-1`,
          type: 'ServiceNexusProfile',
          serviceEndpoint: `${process.env.API_BASE_URL}/did/${did}`
        }],
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      };

      const identity = {
        did,
        type,
        entityId: userOrOrg.id,
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey,
        document: didDocument,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.didRegistry.set(did, identity);

      // Update user/organization with DID
      if (type === 'user') {
        await User.findByIdAndUpdate(userOrOrg.id, { did });
      } else {
        await Organization.findByIdAndUpdate(userOrOrg.id, { did });
      }

      logger.info(`🆔 DID created: ${did} for ${type} ${userOrOrg.id}`);

      return {
        did,
        document: didDocument,
        publicKey: keyPair.publicKey
      };
    } catch (error) {
      logger.error('Error creating DID:', error);
      throw error;
    }
  }

  // Issue Verifiable Credential
  async issueCredential(issuerDID, subjectDID, credentialType, claims, expiration = null) {
    try {
      const issuer = this.didRegistry.get(issuerDID);
      if (!issuer) {
        throw new Error('Issuer DID not found');
      }

      const credential = {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://www.w3.org/2018/credentials/examples/v1'
        ],
        id: this.generateCredentialId(),
        type: ['VerifiableCredential', credentialType],
        issuer: issuerDID,
        issuanceDate: new Date().toISOString(),
        expirationDate: expiration || this.getDefaultExpiration(),
        credentialSubject: {
          id: subjectDID,
          ...claims
        }
      };

      // Sign the credential
      const signedCredential = await this.signCredential(credential, issuer.privateKey);

      const credentialRecord = {
        id: credential.id,
        issuerDID,
        subjectDID,
        type: credentialType,
        credential: signedCredential,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.credentials.set(credential.id, credentialRecord);

      logger.info(`📜 Credential issued: ${credential.id} from ${issuerDID} to ${subjectDID}`);

      return signedCredential;
    } catch (error) {
      logger.error('Error issuing credential:', error);
      throw error;
    }
  }

  // Verify Verifiable Credential
  async verifyCredential(credential) {
    try {
      // Check credential structure
      if (!this.isValidCredentialStructure(credential)) {
        return { valid: false, reason: 'Invalid credential structure' };
      }

      // Check expiration
      if (credential.expirationDate && new Date(credential.expirationDate) < new Date()) {
        return { valid: false, reason: 'Credential expired' };
      }

      // Get issuer DID
      const issuer = this.didRegistry.get(credential.issuer);
      if (!issuer) {
        return { valid: false, reason: 'Issuer not found' };
      }

      // Verify signature
      const signatureValid = await this.verifyCredentialSignature(credential, issuer.publicKey);
      if (!signatureValid) {
        return { valid: false, reason: 'Invalid signature' };
      }

      // Check if credential is revoked
      const credentialRecord = this.credentials.get(credential.id);
      if (credentialRecord && credentialRecord.status === 'revoked') {
        return { valid: false, reason: 'Credential revoked' };
      }

      logger.info(`✅ Credential verified: ${credential.id}`);

      return {
        valid: true,
        issuer: credential.issuer,
        subject: credential.credentialSubject.id,
        type: credential.type,
        issuanceDate: credential.issuanceDate,
        expirationDate: credential.expirationDate
      };
    } catch (error) {
      logger.error('Error verifying credential:', error);
      return { valid: false, reason: 'Verification error' };
    }
  }

  // Revoke Verifiable Credential
  async revokeCredential(credentialId, issuerDID) {
    try {
      const credentialRecord = this.credentials.get(credentialId);
      if (!credentialRecord) {
        throw new Error('Credential not found');
      }

      if (credentialRecord.issuerDID !== issuerDID) {
        throw new Error('Only issuer can revoke credential');
      }

      credentialRecord.status = 'revoked';
      credentialRecord.revokedAt = new Date();
      credentialRecord.updatedAt = new Date();

      // Create revocation credential
      const revocationCredential = await this.issueCredential(
        issuerDID,
        credentialRecord.subjectDID,
        'RevocationCredential',
        {
          revokedCredentialId: credentialId,
          revocationReason: 'Requested by issuer',
          revokedAt: new Date().toISOString()
        }
      );

      logger.info(`❌ Credential revoked: ${credentialId}`);

      return {
        revoked: true,
        credentialId,
        revocationCredentialId: revocationCredential.id,
        revokedAt: credentialRecord.revokedAt
      };
    } catch (error) {
      logger.error('Error revoking credential:', error);
      throw error;
    }
  }

  // Create Verifiable Presentation
  async createPresentation(credentials, holderDID, challenge = null) {
    try {
      const holder = this.didRegistry.get(holderDID);
      if (!holder) {
        throw new Error('Holder DID not found');
      }

      const presentation = {
        '@context': [
          'https://www.w3.org/2018/credentials/v1'
        ],
        type: ['VerifiablePresentation'],
        holder: holderDID,
        verifiableCredential: credentials,
        proof: {
          type: 'Ed25519Signature2018',
          created: new Date().toISOString(),
          proofPurpose: 'authentication',
          verificationMethod: `${holderDID}#keys-1`,
          challenge: challenge || crypto.randomBytes(16).toString('hex')
        }
      };

      // Sign the presentation
      const signedPresentation = await this.signPresentation(presentation, holder.privateKey);

      logger.info(`📋 Presentation created: ${holderDID}`);

      return signedPresentation;
    } catch (error) {
      logger.error('Error creating presentation:', error);
      throw error;
    }
  }

  // Verify Verifiable Presentation
  async verifyPresentation(presentation) {
    try {
      // Check presentation structure
      if (!this.isValidPresentationStructure(presentation)) {
        return { valid: false, reason: 'Invalid presentation structure' };
      }

      // Get holder DID
      const holder = this.didRegistry.get(presentation.holder);
      if (!holder) {
        return { valid: false, reason: 'Holder not found' };
      }

      // Verify presentation signature
      const signatureValid = await this.verifyPresentationSignature(presentation, holder.publicKey);
      if (!signatureValid) {
        return { valid: false, reason: 'Invalid presentation signature' };
      }

      // Verify all credentials in presentation
      const credentialVerifications = [];
      for (const credential of presentation.verifiableCredential) {
        const verification = await this.verifyCredential(credential);
        credentialVerifications.push(verification);
        
        if (!verification.valid) {
          return { valid: false, reason: `Invalid credential: ${verification.reason}` };
        }
      }

      logger.info(`✅ Presentation verified: ${presentation.holder}`);

      return {
        valid: true,
        holder: presentation.holder,
        credentials: credentialVerifications,
        verifiedAt: new Date()
      };
    } catch (error) {
      logger.error('Error verifying presentation:', error);
      return { valid: false, reason: 'Presentation verification error' };
    }
  }

  // Get DID document
  async getDIDDocument(did) {
    try {
      const identity = this.didRegistry.get(did);
      if (!identity) {
        throw new Error('DID not found');
      }

      return identity.document;
    } catch (error) {
      logger.error('Error getting DID document:', error);
      throw error;
    }
  }

  // Resolve DID
  async resolveDID(did) {
    try {
      const identity = this.didRegistry.get(did);
      if (!identity) {
        return { found: false, error: 'DID not found' };
      }

      return {
        found: true,
        didDocument: identity.document,
        didResolutionMetadata: {
          contentType: 'application/did+ld+json',
          created: identity.createdAt,
          updated: identity.updatedAt
        },
        didDocumentMetadata: {
          versionId: '1',
          created: identity.createdAt,
          updated: identity.updatedAt,
          deactivated: identity.status !== 'active'
        }
      };
    } catch (error) {
      logger.error('Error resolving DID:', error);
      return { found: false, error: error.message };
    }
  }

  // Get user credentials
  async getUserCredentials(did, type = null) {
    try {
      const credentials = Array.from(this.credentials.values())
        .filter(cred => cred.subjectDID === did && cred.status === 'active');

      if (type) {
        return credentials.filter(cred => cred.type === type);
      }

      return credentials;
    } catch (error) {
      logger.error('Error getting user credentials:', error);
      return [];
    }
  }

  // Create service-specific credential
  async createServiceCredential(userDID, serviceData) {
    try {
      const serviceNexusDID = await this.getServiceNexusDID();
      
      const claims = {
        serviceId: serviceData.id,
        serviceName: serviceData.title,
        customerName: serviceData.customerName,
        industry: serviceData.industry,
        amount: serviceData.amount,
        status: serviceData.status,
        createdAt: serviceData.createdAt,
        organization: serviceData.organization.name,
        provider: serviceData.assignedTo?.name || 'Unassigned'
      };

      return await this.issueCredential(
        serviceNexusDID,
        userDID,
        'ServiceCredential',
        claims,
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
      );
    } catch (error) {
      logger.error('Error creating service credential:', error);
      throw error;
    }
  }

  // Create organization credential
  async createOrganizationCredential(organizationDID, organizationData) {
    try {
      const serviceNexusDID = await this.getServiceNexusDID();
      
      const claims = {
        organizationName: organizationData.name,
        industry: organizationData.industry,
        website: organizationData.website,
        subscriptionPlan: organizationData.subscriptionPlan,
        maxUsers: organizationData.maxUsers,
        currentUsers: organizationData.currentUsers,
        isActive: organizationData.isActive,
        verified: organizationData.verified || false
      };

      return await this.issueCredential(
        serviceNexusDID,
        organizationDID,
        'OrganizationCredential',
        claims,
        new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString() // 2 years
      );
    } catch (error) {
      logger.error('Error creating organization credential:', error);
      throw error;
    }
  }

  // Utility methods
  generateDID(entity, type) {
    const method = 'did';
    const methodId = 'servicenexus';
    const identifier = crypto.createHash('sha256')
      .update(`${type}-${entity.id}-${entity.name || entity.email}-${Date.now()}`)
      .digest('hex')
      .substring(0, 32);
    
    return `${method}:${methodId}:${identifier}`;
  }

  generateKeyPair() {
    // Generate Ed25519 key pair
    const privateKey = crypto.randomBytes(32);
    const publicKey = crypto.createPublicKey({
      type: 'ed25519',
      privateKey: privateKey
    });

    return {
      privateKey: privateKey.toString('hex'),
      publicKey: publicKey.export({ type: 'spki', format: 'der' }).toString('base64')
    };
  }

  generateCredentialId() {
    return `urn:uuid:${crypto.randomUUID()}`;
  }

  getDefaultExpiration() {
    return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 year
  }

  async signCredential(credential, privateKey) {
    try {
      const credentialHash = crypto.createHash('sha256')
        .update(JSON.stringify(credential))
        .digest();
      
      const signature = crypto.sign(null, credentialHash, crypto.createPrivateKey({
        key: Buffer.from(privateKey, 'hex'),
        format: 'der',
        type: 'pkcs8'
      }));

      return {
        ...credential,
        proof: {
          type: 'Ed25519Signature2018',
          created: new Date().toISOString(),
          proofPurpose: 'assertionMethod',
          verificationMethod: `${credential.issuer}#keys-1`,
          jws: `${Buffer.from(JSON.stringify({ alg: 'EdDSA', crv: 'Ed25519' })).toString('base64url')}.${credentialHash.toString('base64url')}.${signature.toString('base64url')}`
        }
      };
    } catch (error) {
      logger.error('Error signing credential:', error);
      throw error;
    }
  }

  async verifyCredentialSignature(credential, publicKey) {
    try {
      if (!credential.proof || !credential.proof.jws) {
        return false;
      }

      const jwsParts = credential.proof.jws.split('.');
      if (jwsParts.length !== 3) {
        return false;
      }

      const header = JSON.parse(Buffer.from(jwsParts[0], 'base64url').toString());
      const payload = Buffer.from(jwsParts[1], 'base64url');
      const signature = Buffer.from(jwsParts[2], 'base64url');

      // Create credential without proof for verification
      const credentialCopy = { ...credential };
      delete credentialCopy.proof;
      
      const credentialHash = crypto.createHash('sha256')
        .update(JSON.stringify(credentialCopy))
        .digest();

      // Verify signature
      const publicKeyObj = crypto.createPublicKey({
        key: Buffer.from(publicKey, 'base64'),
        format: 'der',
        type: 'spki'
      });

      return crypto.verify(null, credentialHash, signature, publicKeyObj);
    } catch (error) {
      logger.error('Error verifying credential signature:', error);
      return false;
    }
  }

  async signPresentation(presentation, privateKey) {
    try {
      const presentationHash = crypto.createHash('sha256')
        .update(JSON.stringify(presentation))
        .digest();
      
      const signature = crypto.sign(null, presentationHash, crypto.createPrivateKey({
        key: Buffer.from(privateKey, 'hex'),
        format: 'der',
        type: 'pkcs8'
      }));

      presentation.proof.jws = `${Buffer.from(JSON.stringify({ alg: 'EdDSA', crv: 'Ed25519' })).toString('base64url')}.${presentationHash.toString('base64url')}.${signature.toString('base64url')}`;

      return presentation;
    } catch (error) {
      logger.error('Error signing presentation:', error);
      throw error;
    }
  }

  async verifyPresentationSignature(presentation, publicKey) {
    try {
      if (!presentation.proof || !presentation.proof.jws) {
        return false;
      }

      const jwsParts = presentation.proof.jws.split('.');
      if (jwsParts.length !== 3) {
        return false;
      }

      const payload = Buffer.from(jwsParts[1], 'base64url');
      const signature = Buffer.from(jwsParts[2], 'base64url');

      // Create presentation without proof for verification
      const presentationCopy = { ...presentation };
      delete presentationCopy.proof;
      
      const presentationHash = crypto.createHash('sha256')
        .update(JSON.stringify(presentationCopy))
        .digest();

      // Verify signature
      const publicKeyObj = crypto.createPublicKey({
        key: Buffer.from(publicKey, 'base64'),
        format: 'der',
        type: 'spki'
      });

      return crypto.verify(null, presentationHash, signature, publicKeyObj);
    } catch (error) {
      logger.error('Error verifying presentation signature:', error);
      return false;
    }
  }

  isValidCredentialStructure(credential) {
    return (
      credential &&
      credential['@context'] &&
      credential.type &&
      credential.issuer &&
      credential.issuanceDate &&
      credential.credentialSubject &&
      credential.proof
    );
  }

  isValidPresentationStructure(presentation) {
    return (
      presentation &&
      presentation['@context'] &&
      presentation.type &&
      presentation.holder &&
      presentation.verifiableCredential &&
      presentation.proof
    );
  }

  async getServiceNexusDID() {
    // Get or create ServiceNexus platform DID
    let serviceNexusDID = 'did:servicenexus:platform';
    
    if (!this.didRegistry.has(serviceNexusDID)) {
      const platformEntity = {
        id: 'platform',
        name: 'ServiceNexus Platform',
        email: 'platform@servicenexus.com'
      };
      
      const didResult = await this.createDID(platformEntity, 'platform');
      serviceNexusDID = didResult.did;
    }
    
    return serviceNexusDID;
  }

  // Initialize DID registry
  async initializeDIDRegistry() {
    try {
      // Load existing DIDs from database
      const users = await User.find({ did: { $exists: true } });
      const organizations = await Organization.find({ did: { $exists: true } });
      
      for (const user of users) {
        // Reconstruct DID registry entry
        const didEntry = {
          did: user.did,
          type: 'user',
          entityId: user.id,
          publicKey: '', // Would be stored securely
          privateKey: '', // Would be stored securely
          document: {}, // Would be stored in DID document
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        this.didRegistry.set(user.did, didEntry);
      }
      
      for (const org of organizations) {
        const didEntry = {
          did: org.did,
          type: 'organization',
          entityId: org.id,
          publicKey: '',
          privateKey: '',
          document: {},
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        this.didRegistry.set(org.did, didEntry);
      }
      
      logger.info(`📚 DID registry initialized with ${users.length + organizations.length} identities`);
    } catch (error) {
      logger.error('Error initializing DID registry:', error);
    }
  }

  // Setup verifiers
  async setupVerifiers() {
    try {
      // Setup credential verifiers for different types
      this.verifiers.set('ServiceCredential', {
        name: 'Service Credential Verifier',
        rules: [
          'serviceId must be valid',
          'customerName must not be empty',
          'amount must be positive',
          'status must be valid'
        ]
      });
      
      this.verifiers.set('OrganizationCredential', {
        name: 'Organization Credential Verifier',
        rules: [
          'organizationName must not be empty',
          'industry must be valid',
          'subscriptionPlan must be valid'
        ]
      });
      
      logger.info('🔍 Verifiers setup completed');
    } catch (error) {
      logger.error('Error setting up verifiers:', error);
    }
  }

  // Cleanup
  async cleanup() {
    try {
      this.didRegistry.clear();
      this.credentials.clear();
      this.verifiers.clear();
      this.proofs.clear();
      
      logger.info('🧹 Digital Identity Manager cleaned up');
    } catch (error) {
      logger.error('Error cleaning up Digital Identity Manager:', error);
    }
  }
}

module.exports = DigitalIdentityManager;

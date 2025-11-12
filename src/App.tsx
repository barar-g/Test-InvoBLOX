import { useState } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import { Wallet, Zap } from 'lucide-react';
import { NFT_ABI } from './abi';
import { CONTRACT_ADDRESS, REQUIRED_CHAIN_ID, CHAIN_NAME } from './config';

function App() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [contractName, setContractName] = useState<string>('NFT');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [tokenURI, setTokenURI] = useState('');

  const connectWallet = async () => {
    setError(null);
    setIsConnecting(true);

    try {
      if (!window.ethereum) {
        setError('Wallet not detected. Please install MetaMask or Trust Wallet.');
        setIsConnecting(false);
        return;
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      }) as string[];

      if (Array.isArray(accounts) && accounts.length > 0) {
        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        const network = await provider.getNetwork();

        setWalletAddress(address);
        setChainId(Number(network.chainId));

        if (Number(network.chainId) !== REQUIRED_CHAIN_ID) {
          setError(`Wrong network. Please connect to ${CHAIN_NAME} (Chain ID: ${REQUIRED_CHAIN_ID}). Current: ${network.chainId}`);
        } else {
          fetchContractInfo(provider);
        }
      }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        if (err.code === 4001) {
          setError('Connection rejected by user.');
        } else {
          setError('Failed to connect to wallet.');
        }
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const fetchContractInfo = async (provider: BrowserProvider) => {
    try {
      const contract = new Contract(CONTRACT_ADDRESS, NFT_ABI, provider);
      const name = await contract.name();
      setContractName(name || 'NFT');
    } catch {
      setContractName('NFT');
    }
  };

  const mintNFT = async () => {
    if (!walletAddress || !window.ethereum) return;

    setError(null);
    setMessage(null);

    if (!recipientAddress.trim()) {
      setError('Recipient address is required.');
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(recipientAddress)) {
      setError('Invalid Ethereum address format.');
      return;
    }

    if (!tokenURI.trim()) {
      setError('Token URI is required.');
      return;
    }

    setIsMinting(true);

    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, NFT_ABI, signer);

      const tx = await contract.mintTo(recipientAddress, tokenURI);
      setMessage('Transaction sent! Waiting for confirmation...');

      await tx.wait();
      setMessage(`NFT minted successfully! TX: ${tx.hash}`);
      setRecipientAddress('');
      setTokenURI('');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        if (err.code === 4001) {
          setError('Transaction rejected by user.');
        } else {
          setError(`Transaction failed: ${(err as any).message || 'Unknown error'}`);
        }
      } else {
        setError('Minting failed. Please try again.');
      }
    } finally {
      setIsMinting(false);
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setChainId(null);
    setError(null);
    setMessage(null);
    setRecipientAddress('');
    setTokenURI('');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-full mb-3">
            <Zap className="w-7 h-7 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">NFT Mint DApp</h1>
          <p className="text-sm text-gray-500">Simple & minimal</p>
        </div>

        {!walletAddress ? (
          <div className="space-y-3">
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 text-sm"
            >
              {isConnecting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4" />
                  Connect Wallet
                </>
              )}
            </button>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
                {error}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs text-green-700 font-semibold mb-1">Connected</p>
              <p className="text-xs font-mono text-gray-800 break-all bg-white p-2 rounded border border-green-100">
                {walletAddress}
              </p>
              <p className="text-xs text-gray-600 mt-2">
                Contract: {contractName}
              </p>
              <p className="text-xs text-gray-600">
                Chain: {chainId === REQUIRED_CHAIN_ID ? '✓ ' + CHAIN_NAME : 'Wrong Network'}
              </p>
            </div>

            {chainId === REQUIRED_CHAIN_ID && (
              <div className="space-y-3 border-t pt-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Recipient Address
                  </label>
                  <input
                    type="text"
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Token URI
                  </label>
                  <input
                    type="text"
                    value={tokenURI}
                    onChange={(e) => setTokenURI(e.target.value)}
                    placeholder="ipfs://... or https://..."
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  onClick={mintNFT}
                  disabled={isMinting}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
                >
                  {isMinting ? 'Minting...' : 'Mint NFT'}
                </button>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
                {error}
              </div>
            )}

            {message && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded-lg text-xs">
                {message}
              </div>
            )}

            <button
              onClick={disconnectWallet}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors duration-200 text-sm"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

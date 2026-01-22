import { type Address, type PublicClient, type WalletClient, encodeFunctionData, parseAbi } from "viem";
import { base } from "@account-kit/infra";
import { getRealityEthContract, getRealityEthContractAddress, getRealityEthABI } from "./reality-eth-client";
import { encodeQuestionText, validateQuestionData, type QuestionData } from "./reality-eth-utils";

/**
 * Reality.eth Question Wrapper
 * 
 * Handles question creation and answer submission to Reality.eth contracts
 */

export interface CreateQuestionParams {
  templateId: number;
  questionText: string;
  arbitrator: Address;
  timeout: number; // seconds
  openingTs: number; // unix timestamp
  nonce: bigint;
  bond?: bigint; // Optional bond amount in wei
}

export interface SubmitAnswerParams {
  questionId: string; // bytes32 as hex string
  answer: string; // bytes32 as hex string
  maxPrevious: bigint;
  bond: bigint; // Bond amount in wei
}

/**
 * Create a new question on Reality.eth
 * 
 * @param publicClient - Viem public client
 * @param walletClient - Viem wallet client or Account Kit smart account client
 * @param params - Question creation parameters
 * @returns Transaction hash
 */
export async function createQuestion(
  publicClient: PublicClient,
  walletClient: WalletClient | any, // Allow Account Kit client
  params: CreateQuestionParams
): Promise<`0x${string}`> {
  const contractAddress = getRealityEthContractAddress();
  const account = walletClient.account?.address;

  if (!account) {
    throw new Error("Wallet account not found");
  }

  const { templateId, questionText, arbitrator, timeout, openingTs, nonce, bond = 0n } = params;

  // Validate all required parameters
  if (questionText === undefined || questionText === null || questionText === "") {
    throw new Error("Question text is required and cannot be empty");
  }

  if (arbitrator === undefined || arbitrator === null) {
    throw new Error("Arbitrator address is required");
  }

  if (timeout === undefined || timeout === null || isNaN(timeout)) {
    throw new Error("Timeout is required and must be a valid number");
  }

  if (openingTs === undefined || openingTs === null || isNaN(openingTs)) {
    throw new Error("Opening timestamp is required and must be a valid number");
  }

  console.log("🔍 Encoding function data with params:", {
    templateId,
    questionText: questionText.substring(0, 50) + "...",
    arbitrator,
    timeout,
    openingTs,
    nonce: nonce.toString(),
  });

  let abi: any[];
  try {
    abi = getRealityEthABI();
  } catch (abiError: any) {
    console.error("❌ Failed to get Reality.eth ABI:", abiError);
    throw new Error(`Failed to load Reality.eth ABI: ${abiError?.message || 'Unknown error'}`);
  }

  if (!abi || !Array.isArray(abi) || abi.length === 0) {
    console.error("❌ ABI validation failed:", {
      abiType: typeof abi,
      abiIsArray: Array.isArray(abi),
      abiLength: Array.isArray(abi) ? abi.length : 'N/A',
      abiValue: abi,
    });
    throw new Error("Reality.eth ABI is not available or invalid");
  }

  console.log("✅ ABI loaded successfully, length:", abi.length);

  // Verify the function exists in the ABI
  const askQuestionFunction = abi.find(
    (item: any) => item.type === "function" &&
      (item.name === "askQuestion" || item.name === "ask_question")
  );

  if (!askQuestionFunction) {
    console.error("❌ askQuestion function not found in ABI. Available functions:",
      abi.filter((item: any) => item.type === "function").map((item: any) => item.name)
    );
    throw new Error("askQuestion function not found in Reality.eth ABI. The ABI may be incorrect or the function name may be different.");
  }

  console.log("✅ Found askQuestion function in ABI:", {
    name: askQuestionFunction.name,
    inputs: askQuestionFunction.inputs?.length || 0,
  });

  let data: `0x${string}`;
  try {
    // Use the actual function name from the ABI
    const functionName = askQuestionFunction.name;
    data = encodeFunctionData({
      abi,
      functionName: functionName,
      args: [BigInt(templateId), questionText, arbitrator, Number(timeout), Number(openingTs), nonce],
    });

    console.log("✅ Function data encoded successfully, length:", data?.length || 0);
  } catch (encodeError: any) {
    console.error("❌ Error encoding function data:", encodeError);
    console.error("❌ Error details:", {
      abiLength: abi?.length,
      templateId,
      questionTextType: typeof questionText,
      questionTextValue: questionText,
      arbitrator,
      timeout,
      openingTs,
      nonce: nonce?.toString(),
    });
    throw new Error(`Failed to encode function call: ${encodeError?.message || 'Unknown error'}`);
  }

  // Check if this is an Account Kit smart account client (has sendUserOperation)
  if (walletClient.sendUserOperation && typeof walletClient.sendUserOperation === 'function') {
    console.log("📦 Using Account Kit sendUserOperation");

    try {
      // Use Account Kit's sendUserOperation
      const operation = await walletClient.sendUserOperation({
        uo: {
          target: contractAddress,
          data: data as `0x${string}`,
          value: bond,
        },
      });

      console.log("✅ User operation sent, hash:", operation.hash);

      // Wait for the transaction to be mined
      if (walletClient.waitForUserOperationTransaction) {
        const receipt = await walletClient.waitForUserOperationTransaction({
          hash: operation.hash,
        });
        console.log("✅ Transaction receipt received:", receipt);

        if (typeof receipt === 'string') {
          return receipt as `0x${string}`;
        }

        if (receipt && typeof receipt === 'object') {
          // Check for direct transactionHash property (viem TransactionReceipt)
          if ('transactionHash' in receipt) {
            return (receipt as any).transactionHash as `0x${string}`;
          }
          // Check for nested receipt property (Account Kit potential return)
          if ('receipt' in receipt && (receipt as any).receipt && (receipt as any).receipt.transactionHash) {
            return (receipt as any).receipt.transactionHash as `0x${string}`;
          }
        }

        console.error("❌ Invalid receipt format:", receipt);
        throw new Error("Failed to retrieve transaction hash from user operation receipt");
      }

      // If no wait method, return the operation hash
      return operation.hash as `0x${string}`;
    } catch (uoError: any) {
      console.error("❌ Error sending user operation:", uoError);
      throw new Error(`Failed to send user operation: ${uoError?.message || 'Unknown error'}`);
    }
  }

  // Fallback to regular wallet client sendTransaction
  console.log("📝 Using regular wallet sendTransaction");
  try {
    const hash = await walletClient.sendTransaction({
      chain: walletClient.chain || base,
      to: contractAddress,
      data,
      value: bond,
      account,
    });

    return hash;
  } catch (txError: any) {
    console.error("❌ Error sending transaction:", txError);
    throw new Error(`Failed to send transaction: ${txError?.message || 'Unknown error'}`);
  }
}

/**
 * Submit an answer to a Reality.eth question
 * 
 * @param publicClient - Viem public client
 * @param walletClient - Viem wallet client
 * @param params - Answer submission parameters
 * @returns Transaction hash
 */
export async function submitAnswer(
  publicClient: PublicClient,
  walletClient: WalletClient | any,
  params: SubmitAnswerParams
): Promise<`0x${string}`> {
  const contractAddress = getRealityEthContractAddress();
  const account = walletClient.account?.address;

  if (!account) {
    throw new Error("Wallet account not found");
  }

  const { questionId, answer, maxPrevious, bond } = params;

  const abi = getRealityEthABI();
  const data = encodeFunctionData({
    abi,
    functionName: "submitAnswer",
    args: [questionId as `0x${string}`, answer as `0x${string}`, maxPrevious],
  });

  // Check if this is an Account Kit smart account client (has sendUserOperation)
  if (walletClient.sendUserOperation && typeof walletClient.sendUserOperation === 'function') {
    console.log("📦 Using Account Kit sendUserOperation for submitAnswer");

    try {
      const operation = await walletClient.sendUserOperation({
        uo: {
          target: contractAddress,
          data: data as `0x${string}`,
          value: bond,
        },
      });

      console.log("✅ User operation sent, hash:", operation.hash);

      if (walletClient.waitForUserOperationTransaction) {
        const receipt = await walletClient.waitForUserOperationTransaction({
          hash: operation.hash,
        });
        console.log("✅ Transaction receipt received:", receipt);

        if (typeof receipt === 'string') {
          return receipt as `0x${string}`;
        }

        if (receipt && typeof receipt === 'object') {
          if ('transactionHash' in receipt) {
            return (receipt as any).transactionHash as `0x${string}`;
          }
          if ('receipt' in receipt && (receipt as any).receipt && (receipt as any).receipt.transactionHash) {
            return (receipt as any).receipt.transactionHash as `0x${string}`;
          }
        }

        // If we can't find the hash but the op succeeded, return op hash
        return operation.hash as `0x${string}`;
      }

      return operation.hash as `0x${string}`;
    } catch (uoError: any) {
      console.error("❌ Error sending user operation:", uoError);
      throw new Error(`Failed to send user operation: ${uoError?.message || 'Unknown error'}`);
    }
  }

  // Fallback to regular wallet client sendTransaction
  console.log("📝 Using regular wallet sendTransaction");
  const hash = await walletClient.sendTransaction({
    chain: walletClient.chain || base,
    to: contractAddress,
    data,
    value: bond,
    account,
  });

  return hash;
}

/**
 * Question data structure from Reality.eth contract
 */
export interface RealityEthQuestion {
  question: string;
  opening_ts: bigint;
  timeout: bigint;
  finalize_ts: bigint;
  is_pending_arbitration: boolean;
  bounty: bigint;
  best_answer: string; // bytes32 hex string
  history_hash: string; // bytes32 hex string
  bond: bigint;
  min_bond: bigint;
  [key: string]: any; // Allow additional properties
}

/**
 * Get question details from Reality.eth contract
 * 
 * @param publicClient - Viem public client
 * @param questionId - Question ID (bytes32 as hex string)
 * @returns Question data
 */
export async function getQuestion(
  publicClient: PublicClient,
  questionId: string
): Promise<RealityEthQuestion> {
  const contract = getRealityEthContract(publicClient);
  const contractAddress = getRealityEthContractAddress();

  try {
    // 1. Fetch question data from contract state
    const questionDataRaw = await contract.read.questions([questionId as `0x${string}`]);

    // Map the raw data (which might be an array/tuple) to our interface
    // struct Question {
    //     bytes32 content_hash;
    //     address arbitrator;
    //     uint32 opening_ts;
    //     uint32 timeout;
    //     uint32 finalize_ts;
    //     bool is_pending_arbitration;
    //     uint256 bounty;
    //     bytes32 best_answer;
    //     bytes32 history_hash;
    //     uint256 bond;
    //     uint256 min_bond;
    // }
    let structData: any = {};

    if (Array.isArray(questionDataRaw)) {
      structData = {
        content_hash: questionDataRaw[0],
        arbitrator: questionDataRaw[1],
        opening_ts: questionDataRaw[2],
        timeout: questionDataRaw[3],
        finalize_ts: questionDataRaw[4],
        is_pending_arbitration: questionDataRaw[5],
        bounty: questionDataRaw[6],
        best_answer: questionDataRaw[7],
        history_hash: questionDataRaw[8],
        bond: questionDataRaw[9],
        min_bond: questionDataRaw[10],
      };
    } else {
      structData = questionDataRaw;
    }

    // 2. Fetch question text from event logs
    // Event: LogNewQuestion(bytes32 indexed question_id, address indexed user, uint256 template_id, string question, ...)
    let questionText = "";

    try {
      // Use a more recent block if possible to avoid 503 errors on public RPCs
      // Base Mainnet started logging Reality.eth around block 2000000 (rough estimate for older deployments)
      // or just retry gracefully. 
      // For now, we wrap in try/catch so the main data still loads.
      const logs = await publicClient.getLogs({
        address: contractAddress,
        event: parseAbi(['event LogNewQuestion(bytes32 indexed question_id, address indexed user, uint256 template_id, string question, bytes32 indexed content_hash, address arbitrator, uint32 timeout, uint32 opening_ts, uint256 nonce, uint256 created)'])[0],
        args: {
          question_id: questionId as `0x${string}`
        },
        fromBlock: 0n // Explicit 0n instead of 'earliest' sometimes helps, but main fix is try/catch
      });

      if (logs.length > 0) {
        const logArgs = logs[0].args as any;
        questionText = logArgs.question;
      } else {
        console.warn(`No LogNewQuestion event found for ${questionId}. Title might be missing.`);
      }
    } catch (logError) {
      console.warn("⚠️ Failed to fetch question text logs (likely RPC 503 or timeout). Returning Untitled.", logError);
      // Fallback to untitled, do not crash
      questionText = "Untitled Prediction (Error loading valid title)";
    }

    return {
      ...structData,
      question: questionText,
      // Ensure bigints are returned as is, conversions happen in UI
    } as RealityEthQuestion;

  } catch (error) {
    console.error("Error fetching question:", error);
    throw new Error("Failed to fetch question from contract");
  }
}

/**
 * Get the final answer for a question
 * 
 * @param publicClient - Viem public client
 * @param questionId - Question ID (bytes32 as hex string)
 * @returns Final answer (bytes32 as hex string)
 */
export async function getFinalAnswer(
  publicClient: PublicClient,
  questionId: string
): Promise<string | null> {
  const contract = getRealityEthContract(publicClient);

  try {
    const answer = await contract.read.getFinalAnswer([questionId as `0x${string}`]);
    return answer as unknown as string;
  } catch (error: any) {
    // Check if the error is due to the question not being finalized
    if (error?.message?.includes("question must be finalized") ||
      error?.cause?.message?.includes("question must be finalized")) {
      return null;
    }

    console.error("Error fetching final answer:", error);
    throw new Error("Failed to fetch final answer");
  }
}

/**
 * Create question with encoded text
 * 
 * Helper function that combines question encoding with creation
 */
export async function createQuestionWithData(
  publicClient: PublicClient,
  walletClient: WalletClient,
  questionData: QuestionData,
  params: Omit<CreateQuestionParams, "questionText">
): Promise<`0x${string}`> {
  // Validate question data
  const validation = validateQuestionData(questionData);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Encode question text
  let questionText: string;
  try {
    questionText = encodeQuestionText(questionData);

    if (!questionText || typeof questionText !== 'string' || questionText.trim().length === 0) {
      throw new Error("Failed to encode question text: result is empty or invalid");
    }

    console.log("✅ Question text encoded successfully, length:", questionText.length);
  } catch (encodeError: any) {
    console.error("❌ Error encoding question text:", encodeError);
    console.error("❌ Question data:", questionData);
    throw new Error(`Failed to encode question text: ${encodeError?.message || 'Unknown error'}`);
  }

  // Create question
  return createQuestion(publicClient, walletClient, {
    ...params,
    questionText,
  });
}

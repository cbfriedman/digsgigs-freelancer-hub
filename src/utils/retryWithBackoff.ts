interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
  } = options;

  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on the last attempt
      if (attempt === maxAttempts) {
        break;
      }

      // Check if it's a network error that should be retried
      const shouldRetry = isRetryableError(error);
      if (!shouldRetry) {
        throw error;
      }

      console.log(`Retry attempt ${attempt}/${maxAttempts} after ${delay}ms...`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Increase delay for next attempt, but cap at maxDelay
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError!;
}

function isRetryableError(error: any): boolean {
  // Network errors
  if (error?.message?.includes('fetch') || 
      error?.message?.includes('network') ||
      error?.message?.includes('NetworkError') ||
      error?.message?.includes('Failed to fetch')) {
    return true;
  }

  // Supabase specific errors that indicate temporary issues
  if (error?.code === 'PGRST301' || // timeout
      error?.code === '08P01' || // network failure
      error?.status === 503 || // service unavailable
      error?.status === 504 || // gateway timeout
      error?.status === 429) { // too many requests
    return true;
  }

  return false;
}

/**
 * abrLookup.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Service for validating and verifying Australian Business Numbers (ABN)
 * using the Australian Business Register (ABR) free API.
 */

import { ABRVerificationResult } from '@/types/abr.types';

/**
 * ABN validation weighting factors for checksum calculation.
 * These are the official Australian ABN validation weights.
 */
const ABN_WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];

/**
 * Validates ABN format using the Australian checksum algorithm.
 * 
 * Algorithm:
 * 1. Subtract 1 from the first digit
 * 2. Multiply each digit by its corresponding weight [10,1,3,5,7,9,11,13,15,17,19]
 * 3. Sum all results
 * 4. Divide by 89
 * 5. If remainder is 0, ABN is valid
 * 
 * @param abn - The ABN to validate (can include spaces)
 * @returns boolean indicating if the ABN format is valid
 */
export function validateABNFormat(abn: string): boolean {
  // Remove all spaces and non-numeric characters
  const cleanABN = abn.replace(/\D/g, '');
  
  // Must be exactly 11 digits
  if (cleanABN.length !== 11) {
    return false;
  }
  
  // Must be numeric only
  if (!/^\d{11}$/.test(cleanABN)) {
    return false;
  }
  
  // Convert to digits array
  const digits = cleanABN.split('').map(Number);
  
  // Subtract 1 from the first digit
  digits[0] = digits[0] - 1;
  
  // Calculate weighted sum
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    sum += digits[i] * ABN_WEIGHTS[i];
  }
  
  // Valid if remainder when divided by 89 is 0
  return sum % 89 === 0;
}

/**
 * Formats ABN for display (XX XXX XXX XXX)
 * @param abn - The ABN string (with or without spaces)
 * @returns Formatted ABN string
 */
export function formatABNForDisplay(abn: string): string {
  const cleanABN = abn.replace(/\D/g, '');
  if (cleanABN.length !== 11) return abn;
  
  return `${cleanABN.slice(0, 2)} ${cleanABN.slice(2, 5)} ${cleanABN.slice(5, 8)} ${cleanABN.slice(8, 11)}`;
}

/**
 * Removes all formatting from ABN, returns clean 11-digit string
 * @param abn - The ABN string (with or without spaces)
 * @returns Clean ABN string
 */
export function cleanABN(abn: string): string {
  return abn.replace(/\D/g, '');
}

/**
 * Interface for ABR JSONP response structure
 */
interface ABRResponse {
  Abn?: string;
  AbnStatus?: string;
  AbnStatusCode?: string;
  Name?: string;
  OrganisationName?: string;
  EntityName?: string;
  Gst?: string;
  EntityTypeCode?: string;
  EntityTypeName?: string;
  AddressState?: string;
  Message?: string;
}

/**
 * Verifies an ABN against the Australian Business Register (ABR) API.
 * Uses JSONP callback format - strips wrapper and parses JSON.
 * 
 * @param abn - The ABN to verify (clean 11 digits)
 * @param guid - The ABR GUID from PlatformSettings
 * @returns ABRVerificationResult with validation details
 */
export async function verifyABN(
  abn: string,
  guid: string
): Promise<ABRVerificationResult> {
  const cleanAbn = cleanABN(abn);
  
  // Validate format first
  if (!validateABNFormat(cleanAbn)) {
    return {
      isValid: false,
      isActive: false,
      businessName: null,
      gstRegistered: null,
      abnStatus: null,
      entityType: null,
      state: null,
      error: 'Invalid ABN format',
    };
  }
  
  try {
    const url = `https://abr.business.gov.au/json/AbnDetails.aspx?abn=${cleanAbn}&callback=callback&guid=${guid}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/javascript',
      },
    });
    
    if (!response.ok) {
      return {
        isValid: false,
        isActive: false,
        businessName: null,
        gstRegistered: null,
        abnStatus: null,
        entityType: null,
        state: null,
        error: 'ABR service unavailable',
      };
    }
    
    // Get the JSONP response text
    const text = await response.text();
    
    // Strip the callback wrapper: callback({...}) -> {...}
    const jsonMatch = text.match(/callback\(([\s\S]*)\);?$/);
    if (!jsonMatch || !jsonMatch[1]) {
      return {
        isValid: false,
        isActive: false,
        businessName: null,
        gstRegistered: null,
        abnStatus: null,
        entityType: null,
        state: null,
        error: 'Invalid ABR response format',
      };
    }
    
    // Parse the JSON content
    const data: ABRResponse = JSON.parse(jsonMatch[1]);
    
    // Check if there's an error message in the response
    if (data.Message) {
      return {
        isValid: false,
        isActive: false,
        businessName: null,
        gstRegistered: null,
        abnStatus: null,
        entityType: null,
        state: null,
        error: data.Message,
      };
    }
    
    // Determine status from AbnStatus field
    // Active ABNs have AbnStatus "Active" or similar
    const status = data.AbnStatus || '';
    const statusCode = data.AbnStatusCode || '';
    const isActive = status.toLowerCase() === 'active' && statusCode !== 'Cancelled';
    
    // Extract business name from various possible fields
    const businessName = data.OrganisationName || 
                        data.EntityName || 
                        data.Name || 
                        null;
    
    // GST registration status
    const gstRegistered = data.Gst === 'Y' || data.Gst === 'YES' || data.Gst === 'true';
    
    return {
      isValid: true,
      isActive,
      businessName,
      gstRegistered,
      abnStatus: status,
      entityType: data.EntityTypeName || data.EntityTypeCode || null,
      state: data.AddressState || null,
    };
    
  } catch (error) {
    // Handle network errors or parsing errors gracefully
    return {
      isValid: false,
      isActive: false,
      businessName: null,
      gstRegistered: null,
      abnStatus: null,
      entityType: null,
      state: null,
      error: 'ABR service unavailable',
    };
  }
}

/**
 * Test ABN for ABR API connectivity testing
 * This is ABR's own test ABN: 51824753556
 */
export const TEST_ABN = '51824753556';

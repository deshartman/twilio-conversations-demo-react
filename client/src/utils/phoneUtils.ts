/**
 * Extracts only digits from a phone number string, removing all non-digit characters
 *
 * @param phoneNumber - The raw phone number input
 * @returns String containing only digits
 */
export const formatPhoneNumber = (phoneNumber: string): string => {
  return phoneNumber.replace(/\D/g, "");
};

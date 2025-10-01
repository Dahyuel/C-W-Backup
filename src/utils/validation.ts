export const validateVolunteerId = (volunteerId: string): string | null => {
  if (!volunteerId || !volunteerId.trim()) {
    return null; // Volunteer ID is optional
  }
  
  const volunteerIdRegex = /^[A-Z]{2,6}\d{2,4}$/;
  if (!volunteerIdRegex.test(volunteerId.trim())) {
    return 'Volunteer ID must be in valid format (e.g., REG01, VOL15, TLDR02)';
  }
  
  return null;
};
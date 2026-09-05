import { getMerchantSettings } from './store.js';

export const evaluatePolicy = (incident, overrides = {}, now = new Date()) => {
  const configured = { ...getMerchantSettings(), ...overrides };
  const hour = now.getHours();
  const inQuietHours = configured.quietHoursEnabled && (hour >= configured.quietStartHour || hour < configured.quietEndHour);
  const isOutreach = ['send_link', 'reminder', 'promise_to_pay'].includes(incident.action?.type);
  const retryBlocked = incident.retry_count >= configured.maxRetries;
  const contactBlocked = incident.contact_count >= configured.maxContacts;
  const optedOut = incident.customer?.opted_out === true;
  const consentMissing = configured.requireConsentForOutreach && incident.customer?.contact_consent === false;
  const highValue = incident.amount_paise >= configured.highValueThresholdPaise;

  if (optedOut && isOutreach) return { status: 'blocked', reason: 'Customer opted out of communication.' };
  if (consentMissing && isOutreach) return { status: 'blocked', reason: 'Customer has not consented to recovery outreach.' };
  if (isOutreach && inQuietHours) return { status: 'blocked', reason: 'Quiet hours are active.' };
  if (isOutreach && contactBlocked) return { status: 'blocked', reason: 'Customer contact limit reached.' };
  if (incident.action?.type === 'retry' && retryBlocked) return { status: 'blocked', reason: 'Maximum retry limit reached.' };
  if (highValue && configured.highValueRequiresApproval) return { status: 'approval_required', reason: 'High-value recovery requires human approval.' };
  return { status: 'allowed', reason: 'Action is within merchant policy.' };
};

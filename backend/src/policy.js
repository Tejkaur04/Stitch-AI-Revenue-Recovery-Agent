const DEFAULT_POLICY = {
  maxRetries: 3,
  maxContacts: 1,
  cooldownHours: 72,
  quietStartHour: 21,
  quietEndHour: 9,
  highValueThresholdPaise: 10000000,
  highValueRequiresApproval: true
};

export const evaluatePolicy = (incident, policy = DEFAULT_POLICY, now = new Date()) => {
  const configured = { ...DEFAULT_POLICY, ...policy };
  const hour = now.getHours();
  const inQuietHours = hour >= configured.quietStartHour || hour < configured.quietEndHour;
  const isOutreach = ['send_link', 'reminder'].includes(incident.action?.type);
  const retryBlocked = incident.retry_count >= configured.maxRetries;
  const contactBlocked = incident.contact_count >= configured.maxContacts;
  const optedOut = incident.customer?.opted_out === true;
  const highValue = incident.amount_paise >= configured.highValueThresholdPaise;

  if (optedOut && isOutreach) return { status: 'blocked', reason: 'Customer opted out of communication.' };
  if (isOutreach && inQuietHours) return { status: 'blocked', reason: 'Quiet hours are active (21:00-09:00 local time).' };
  if (isOutreach && contactBlocked) return { status: 'blocked', reason: 'Customer contact limit reached.' };
  if (incident.action?.type === 'retry' && retryBlocked) return { status: 'blocked', reason: 'Maximum retry limit reached.' };
  if (highValue && configured.highValueRequiresApproval) return { status: 'approval_required', reason: 'High-value recovery requires human approval.' };
  return { status: 'allowed', reason: 'Action is within merchant policy.' };
};

export { DEFAULT_POLICY };

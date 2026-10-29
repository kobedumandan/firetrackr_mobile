// Departure takes precedence for dispatches recorded before acknowledgement
// became an explicit step. Individual arrival remains separate from team arrival.
export function nextDispatchAction(dispatch) {
  const status = dispatch?.personnel_status ?? dispatch?.dispatch_status;
  if (status !== 'dispatched' && status !== 'en_route') return null;
  if (dispatch.departed_at) return 'arrive';
  if (dispatch.acknowledged_at) return 'depart';
  return 'acknowledge';
}

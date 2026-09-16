// Keep the app and public website aligned with the implemented data flows.
// The business must review this notice and publish a working support contact before launch.
export const PRIVACY_UPDATED = "16 September 2026";
export const PRIVACY_SECTIONS = [
  {
    title: "What Matrizo collects",
    body: "When you create an account, we collect your name, email address, mobile number and a protected password hash. We store delivery addresses, cart contents, order items, amounts, payment status and order progress so we can fulfil your purchases. If you enable order notifications, we store your device’s push notification token.",
  },
  {
    title: "How your information is used",
    body: "We use this information to sign you in, recover your account, check delivery coverage, process orders and keep you informed about them. Authorised store and delivery staff can access the details needed to handle an order. Cash-on-delivery purchases do not require card or bank details in the app.",
  },
  {
    title: "Service providers",
    body: "Cloudflare hosts the service and its database. Resend handles account recovery email when email recovery is available. If you opt in to push notifications, Expo, Apple and Google process the device token and order notification. These services process information to provide the features you use.",
  },
  {
    title: "Device permissions and local storage",
    body: "Notifications are optional and require your permission. Delivery coverage uses the pincode you enter; this app does not request your GPS location, contacts, camera or microphone. The app keeps session credentials in the device’s protected storage and stores preferences and an unfinished checkout reference locally. The app does not include advertising or behavioural analytics SDKs.",
  },
  {
    title: "Your controls",
    body: "You can update your name and delivery addresses in your account, and turn order notifications off there or in your phone settings. An address already attached to an order cannot be removed on its own. Use account deletion to remove personal information associated with completed orders. Sign out to remove the app’s saved session.",
  },
  {
    title: "Deleting your account",
    body: "Delete your account in the app under You → Delete my account, or use matrizo.com/delete-account without reinstalling the app. Confirm your identity with your password. Access is closed immediately and notifications stop. Your name, email, mobile number, password and addresses are removed. If an order is open, the details needed to complete it remain until delivery or cancellation and are then removed automatically. Deletion does not cancel an open order.",
  },
  {
    title: "Records after deletion",
    body: "Order items, amounts, payment status, inventory and accounting records are retained without your contact details. You lose access to order history and any wallet balance when the account is deleted. Save any records you need and resolve open order or balance questions before deleting. Provider backups may retain earlier copies until their backup retention expires; deletion is reapplied before any restored data is returned to service.",
  },
] as const;

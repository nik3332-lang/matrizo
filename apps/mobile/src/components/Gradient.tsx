import { LinearGradient } from 'expo-linear-gradient';
import { cssInterop } from 'nativewind';

// LinearGradient isn't a NativeWind-patched primitive (View/Text/etc are
// patched automatically; third-party components need explicit opt-in) — this
// module-level cssInterop() call teaches it to turn `className` into
// `style`, so `<Gradient className="...">` works exactly like `<View
// className="...">` everywhere else in the app. Registered once here since
// cssInterop() must run before the component is first rendered anywhere.
cssInterop(LinearGradient, { className: 'style' });

export { LinearGradient as Gradient };

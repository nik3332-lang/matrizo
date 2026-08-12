import {
  type AdminOrder,
  ApiError,
  type Category,
  type DeliveryPincode,
  type Order,
  type Product,
} from '@matrizo/shared';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ownerApi } from '../../lib/ownerApi';
import { useOwnerAuthStore } from '../../stores/ownerAuth';

// Not linked from anywhere in the app's UI (no tab, no nav item, no Link to
// it) — reachable only by someone who navigates to /owner directly. That's
// obscurity, not access control, so the real gate is the email+password
// login below and the owner-only JWT every request under here requires.

type Section = 'products' | 'categories' | 'orders' | 'pincodes';

export default function OwnerScreen() {
  const ownerToken = useOwnerAuthStore((s) => s.ownerToken);
  const hydrated = useOwnerAuthStore((s) => s.hydrated);
  const hydrate = useOwnerAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return <View className="flex-1 bg-cream" />;
  }

  return (
    <View className="flex-1 bg-cream">
      {ownerToken ? <OwnerDashboard /> : <OwnerLogin />}
    </View>
  );
}

function OwnerLogin() {
  const login = useOwnerAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setError(null);
    setLoading(true);
    try {
      const res = await ownerApi.login(email.trim(), password.trim());
      await login(res.ownerToken);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 justify-center px-6">
      <Text className="text-2xl font-black text-ink">Owner Login</Text>

      <TextInput
        className="mt-6 rounded-xl border-2 border-purple bg-white px-4 py-3 text-ink"
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        className="mt-3 rounded-xl border-2 border-purple bg-white px-4 py-3 text-ink"
        placeholder="Password"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        value={password}
        onChangeText={setPassword}
      />

      {error ? <Text className="mt-3 text-sm font-semibold text-orange">{error}</Text> : null}

      <Pressable
        disabled={loading || !email || !password}
        onPress={handleLogin}
        className={`mt-6 items-center rounded-xl bg-purple py-4 ${loading || !email || !password ? 'opacity-50' : ''}`}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text className="font-extrabold text-white">Log In</Text>}
      </Pressable>
    </View>
  );
}

function OwnerDashboard() {
  const logout = useOwnerAuthStore((s) => s.logout);
  const [section, setSection] = useState<Section>('products');

  return (
    <View className="flex-1 pt-14">
      <View className="flex-row items-center justify-between px-5">
        <Text className="text-2xl font-black text-ink">Owner Dashboard</Text>
        <Pressable onPress={() => logout()}>
          <Text className="font-semibold text-orange">Log out</Text>
        </Pressable>
      </View>

      <View className="mt-4 flex-row px-5" style={{ gap: 8 }}>
        {(
          [
            ['products', 'Products'],
            ['categories', 'Categories'],
            ['orders', 'Orders'],
            ['pincodes', 'Pincodes'],
          ] as [Section, string][]
        ).map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setSection(key)}
            className={`rounded-full px-4 py-2 ${section === key ? 'bg-purple' : 'bg-white'}`}
          >
            <Text className={`font-bold ${section === key ? 'text-white' : 'text-ink'}`}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {section === 'products' ? <ProductsSection /> : null}
      {section === 'categories' ? <CategoriesSection /> : null}
      {section === 'orders' ? <OrdersSection /> : null}
      {section === 'pincodes' ? <PincodesSection /> : null}
    </View>
  );
}

function ProductsSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [categoryId, setCategoryId] = useState('');

  function load() {
    setLoading(true);
    Promise.all([ownerApi.getProducts(), ownerApi.getCategories()])
      .then(([p, c]) => {
        setProducts(p.products);
        setCategories(c.categories);
        setCategoryId((prev) => prev || c.categories[0]?.id || '');
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleAdd() {
    setMessage(null);
    const price = Number(basePrice);
    if (!slug || !name || !unit || !categoryId || !Number.isFinite(price) || price <= 0) {
      setMessage('Fill in slug, name, unit, category and a valid price.');
      return;
    }
    try {
      await ownerApi.createProduct({ slug, name, unit, basePrice: price, categoryId });
      setSlug('');
      setName('');
      setUnit('');
      setBasePrice('');
      setShowAdd(false);
      load();
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : 'Could not add product');
    }
  }

  async function handlePriceChange(product: Product, newPrice: string) {
    const price = Number(newPrice);
    if (!Number.isFinite(price) || price <= 0) return;
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, basePrice: price } : p)));
    try {
      await ownerApi.updateProduct(product.id, { basePrice: price });
    } catch {
      setMessage('Could not save price — try again');
      load();
    }
  }

  async function handleToggleActive(product: Product) {
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, active: !p.active } : p)));
    await ownerApi.updateProduct(product.id, { active: !product.active }).catch(() => load());
  }

  async function handleDelete(product: Product) {
    setProducts((prev) => prev.filter((p) => p.id !== product.id));
    await ownerApi.deleteProduct(product.id).catch(() => load());
  }

  if (loading) {
    return <ActivityIndicator className="mt-8" color="#6B21A8" />;
  }

  return (
    <ScrollView className="flex-1 px-5 pt-4">
      <Pressable onPress={() => setShowAdd((v) => !v)} className="mb-3 items-center rounded-xl bg-orange py-3">
        <Text className="font-extrabold text-white">{showAdd ? 'Cancel' : '+ Add Product'}</Text>
      </Pressable>

      {showAdd ? (
        <View className="mb-4 rounded-xl bg-white p-4">
          <TextInput
            className="mb-2 rounded-lg border border-purple px-3 py-2 text-ink"
            placeholder="Slug (e.g. asian-paints-tractor-1l)"
            autoCapitalize="none"
            value={slug}
            onChangeText={setSlug}
          />
          <TextInput
            className="mb-2 rounded-lg border border-purple px-3 py-2 text-ink"
            placeholder="Name"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            className="mb-2 rounded-lg border border-purple px-3 py-2 text-ink"
            placeholder="Unit (e.g. per litre)"
            value={unit}
            onChangeText={setUnit}
          />
          <TextInput
            className="mb-2 rounded-lg border border-purple px-3 py-2 text-ink"
            placeholder="Base price (₹)"
            keyboardType="decimal-pad"
            value={basePrice}
            onChangeText={setBasePrice}
          />
          <Text className="mb-1 mt-1 text-sm font-semibold text-ink-body">Category</Text>
          <View className="mb-3 flex-row flex-wrap" style={{ gap: 6 }}>
            {categories.map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => setCategoryId(cat.id)}
                className={`rounded-full px-3 py-1.5 ${categoryId === cat.id ? 'bg-purple' : 'bg-cream'}`}
              >
                <Text className={categoryId === cat.id ? 'font-bold text-white' : 'text-ink-body'}>{cat.name}</Text>
              </Pressable>
            ))}
          </View>
          {message ? <Text className="mb-2 text-sm font-semibold text-orange">{message}</Text> : null}
          <Pressable onPress={handleAdd} className="items-center rounded-xl bg-purple py-3">
            <Text className="font-extrabold text-white">Save Product</Text>
          </Pressable>
        </View>
      ) : null}

      {products.map((product) => (
        <View key={product.id} className="mb-3 rounded-xl bg-white p-4">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-2">
              <Text className="font-bold text-ink">{product.name}</Text>
              <Text className="text-sm text-ink-body">
                {product.slug} · {product.unit}
              </Text>
            </View>
            <Switch value={product.active} onValueChange={() => handleToggleActive(product)} />
          </View>

          <View className="mt-3 flex-row items-center" style={{ gap: 8 }}>
            <Text className="font-bold text-ink">₹</Text>
            <TextInput
              className="rounded-lg border border-purple px-3 py-1.5 text-ink"
              style={{ minWidth: 90 }}
              keyboardType="decimal-pad"
              defaultValue={String(product.basePrice)}
              onEndEditing={(e) => handlePriceChange(product, e.nativeEvent.text)}
            />
            <View className="flex-1" />
            <Pressable onPress={() => handleDelete(product)}>
              <Text className="font-semibold text-orange">Delete</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function CategoriesSection() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');

  function load() {
    setLoading(true);
    ownerApi
      .getCategories()
      .then((res) => setCategories(res.categories))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleAdd() {
    setMessage(null);
    if (!slug || !name) {
      setMessage('Slug and name are required.');
      return;
    }
    try {
      await ownerApi.createCategory({ slug, name, icon: icon || undefined });
      setSlug('');
      setName('');
      setIcon('');
      setShowAdd(false);
      load();
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : 'Could not add category');
    }
  }

  async function handleDelete(category: Category) {
    setCategories((prev) => prev.filter((c) => c.id !== category.id));
    await ownerApi.deleteCategory(category.id).catch(() => load());
  }

  if (loading) {
    return <ActivityIndicator className="mt-8" color="#6B21A8" />;
  }

  return (
    <ScrollView className="flex-1 px-5 pt-4">
      <Pressable onPress={() => setShowAdd((v) => !v)} className="mb-3 items-center rounded-xl bg-orange py-3">
        <Text className="font-extrabold text-white">{showAdd ? 'Cancel' : '+ Add Category'}</Text>
      </Pressable>

      {showAdd ? (
        <View className="mb-4 rounded-xl bg-white p-4">
          <TextInput
            className="mb-2 rounded-lg border border-purple px-3 py-2 text-ink"
            placeholder="Slug (e.g. paints)"
            autoCapitalize="none"
            value={slug}
            onChangeText={setSlug}
          />
          <TextInput
            className="mb-2 rounded-lg border border-purple px-3 py-2 text-ink"
            placeholder="Name"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            className="mb-2 rounded-lg border border-purple px-3 py-2 text-ink"
            placeholder="Icon emoji (optional)"
            value={icon}
            onChangeText={setIcon}
          />
          {message ? <Text className="mb-2 text-sm font-semibold text-orange">{message}</Text> : null}
          <Pressable onPress={handleAdd} className="items-center rounded-xl bg-purple py-3">
            <Text className="font-extrabold text-white">Save Category</Text>
          </Pressable>
        </View>
      ) : null}

      {categories.map((category) => (
        <View key={category.id} className="mb-3 flex-row items-center justify-between rounded-xl bg-white p-4">
          <Text className="mr-3 text-2xl">{category.icon}</Text>
          <Text className="flex-1 font-bold text-ink">{category.name}</Text>
          <Pressable onPress={() => handleDelete(category)}>
            <Text className="font-semibold text-orange">Delete</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const STATUS_FLOW: Order['status'][] = ['placed', 'confirmed', 'out_for_delivery', 'delivered'];
const STATUS_LABELS: Record<Order['status'], string> = {
  placed: 'Order Placed',
  confirmed: 'Confirmed',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

function OrdersSection() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    ownerApi
      .getOrders()
      .then((res) => setOrders(res.orders))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function setStatus(order: AdminOrder, status: Order['status']) {
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status } : o)));
    await ownerApi.updateOrderStatus(order.id, status).catch(() => load());
  }

  if (loading) {
    return <ActivityIndicator className="mt-8" color="#6B21A8" />;
  }

  return (
    <ScrollView className="flex-1 px-5 pt-4">
      {orders.length === 0 ? <Text className="mt-6 text-center text-ink-body">No orders yet.</Text> : null}
      {orders.map((order) => {
        const nextIndex = STATUS_FLOW.indexOf(order.status) + 1;
        const next = nextIndex < STATUS_FLOW.length ? STATUS_FLOW[nextIndex] : null;
        return (
          <View key={order.id} className="mb-3 rounded-xl bg-white p-4">
            <View className="flex-row items-center justify-between">
              <Text className="font-bold text-ink">Order #{order.id.slice(0, 8)}</Text>
              <Text className="font-extrabold text-purple">₹{order.totalAmount}</Text>
            </View>
            <Text className="mt-1 text-sm text-ink-body">
              {order.userPhone} · {order.paymentMethod.toUpperCase()} · {STATUS_LABELS[order.status]}
            </Text>
            {order.status !== 'cancelled' && order.status !== 'delivered' ? (
              <View className="mt-3 flex-row" style={{ gap: 8 }}>
                {next ? (
                  <Pressable onPress={() => setStatus(order, next)} className="rounded-full bg-purple px-3 py-1.5">
                    <Text className="text-sm font-bold text-white">Mark {STATUS_LABELS[next]}</Text>
                  </Pressable>
                ) : null}
                <Pressable onPress={() => setStatus(order, 'cancelled')} className="rounded-full bg-cream px-3 py-1.5">
                  <Text className="text-sm font-bold text-orange">Cancel</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

function PincodesSection() {
  const [pincodes, setPincodes] = useState<DeliveryPincode[]>([]);
  const [loading, setLoading] = useState(true);
  const [pincode, setPincode] = useState('');
  const [eta, setEta] = useState('60');
  const [message, setMessage] = useState<string | null>(null);

  function load() {
    setLoading(true);
    ownerApi
      .getPincodes()
      .then((res) => setPincodes(res.pincodes))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleAdd() {
    setMessage(null);
    if (!/^\d{6}$/.test(pincode)) {
      setMessage('Enter a valid 6-digit pincode.');
      return;
    }
    try {
      await ownerApi.upsertPincode({ pincode, etaMinutes: Number(eta) || 60, serviceable: true });
      setPincode('');
      load();
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : 'Could not add pincode');
    }
  }

  async function handleDelete(p: DeliveryPincode) {
    setPincodes((prev) => prev.filter((x) => x.pincode !== p.pincode));
    await ownerApi.deletePincode(p.pincode).catch(() => load());
  }

  async function handleToggleServiceable(p: DeliveryPincode) {
    setPincodes((prev) =>
      prev.map((x) => (x.pincode === p.pincode ? { ...x, serviceable: !x.serviceable } : x))
    );
    await ownerApi.upsertPincode({ pincode: p.pincode, serviceable: !p.serviceable }).catch(() => load());
  }

  if (loading) {
    return <ActivityIndicator className="mt-8" color="#6B21A8" />;
  }

  return (
    <ScrollView className="flex-1 px-5 pt-4">
      <View className="mb-4 rounded-xl bg-white p-4">
        <View className="flex-row" style={{ gap: 8 }}>
          <TextInput
            className="flex-1 rounded-lg border border-purple px-3 py-2 text-ink"
            placeholder="6-digit pincode"
            keyboardType="number-pad"
            maxLength={6}
            value={pincode}
            onChangeText={setPincode}
          />
          <TextInput
            className="rounded-lg border border-purple px-3 py-2 text-ink"
            style={{ width: 90 }}
            placeholder="ETA min"
            keyboardType="number-pad"
            value={eta}
            onChangeText={setEta}
          />
        </View>
        {message ? <Text className="mt-2 text-sm font-semibold text-orange">{message}</Text> : null}
        <Pressable onPress={handleAdd} className="mt-3 items-center rounded-xl bg-purple py-3">
          <Text className="font-extrabold text-white">Add / Update Pincode</Text>
        </Pressable>
      </View>

      {pincodes.map((p) => (
        <View key={p.pincode} className="mb-3 flex-row items-center justify-between rounded-xl bg-white p-4">
          <View>
            <Text className="font-bold text-ink">{p.pincode}</Text>
            <Text className="text-sm text-ink-body">{p.etaMinutes} min ETA</Text>
          </View>
          <View className="flex-row items-center" style={{ gap: 12 }}>
            <Switch value={p.serviceable} onValueChange={() => handleToggleServiceable(p)} />
            <Pressable onPress={() => handleDelete(p)}>
              <Text className="font-semibold text-orange">Delete</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

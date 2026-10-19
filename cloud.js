// Triangle Splitter accounts + sync (Firebase). Loaded as a module after the main script.
// If config.js has no Firebase settings, this does nothing and the app runs in local-only mode.
let F;  // Firebase SDK, loaded only when accounts are turned on

const cfg = window.SPLITIT_CONFIG || {};
const C = window.Cloud = { enabled: false, user: null, profile: { venmo: '', savedPeople: [] } };

if (cfg.firebase && cfg.firebase.apiKey) import('./firebase.js').then(mod => { F = mod; init(); });

function init() {
  const app = F.initializeApp(cfg.firebase);
  const auth = F.getAuth(app);
  const db = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) });
  if (cfg.emulator) {
    F.connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    F.connectFirestoreEmulator(db, 'localhost', 8080);
    C._test = { auth, F };
  }
  C.enabled = true;

  const billRef = id => F.doc(db, 'bills', id);
  const pubRef = id => F.doc(db, 'bills', id, 'public', 'menu');
  const memRef = (id, uid) => F.doc(db, 'bills', id, 'members', uid);
  const userRef = uid => F.doc(db, 'users', uid);
  let unsubMembers = null, unsubJoin = [], saveTimer = null, sharedFor = null;

  F.getRedirectResult(auth).catch(e => toast(signInError(e)));
  F.onAuthStateChanged(auth, async u => {
    C.user = u;
    if (u) {
      try {
        const snap = await F.getDoc(userRef(u.uid));
        const d = snap.exists() ? snap.data() : {};
        C.profile = { venmo: d.venmo || '', zelle: d.zelle || '', payMethod: d.payMethod || 'venmo', savedPeople: d.savedPeople || [] };
        // account's payment info wins; otherwise upload what this phone has
        if (d.venmo || d.zelle) storePay({ method: C.profile.payMethod, venmo: C.profile.venmo, zelle: C.profile.zelle });
        else { const p = loadPay(); if (p.venmo || p.zelle) C.setPay(p); }
        // merge friends saved on this device with friends saved on the account
        mergeFriends(C.profile.savedPeople, d.removedPeople || []);
        C.syncSaved();
        await importLocalBills();
      } catch (e) { console.warn(e); }
      closeSheet();
    } else {
      C.profile = { venmo: '', savedPeople: [] };
    }
    renderAccount();
    route();
  });

  /* ---- auth ---- */
  C.signIn = async kind => {
    const provider = kind === 'apple' ? new F.OAuthProvider('apple.com') : new F.GoogleAuthProvider();
    if (kind === 'apple') { provider.addScope('email'); provider.addScope('name'); }
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    try {
      if (standalone) await F.signInWithRedirect(auth, provider);   // Home Screen app: popups don't work
      else await F.signInWithPopup(auth, provider);
    } catch (e) {
      if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') F.signInWithRedirect(auth, provider);
      else if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') toast(signInError(e));
    }
  };
  C.signOut = async () => { C.closeBill(); await F.signOut(auth); reset(); };
  C.firstName = () => (C.user.displayName || 'Me').split(' ')[0];
  function signInError(e) {
    if (!e || !e.code) return 'Sign-in failed. Try again.';
    if (e.code === 'auth/unauthorized-domain') return 'This web address isn\'t approved for sign-in yet (see setup step 4).';
    if (e.code === 'auth/network-request-failed') return 'You need a connection to sign in.';
    return 'Sign-in failed (' + e.code.replace('auth/', '') + ').';
  }

  /* ---- profile ---- */
  C.syncSaved = () => {
    if (!C.user) return;
    const list = loadSaved().slice(0, 50);
    F.setDoc(userRef(C.user.uid), { savedPeople: list, removedPeople: loadRemoved(), updatedAt: F.serverTimestamp() }, { merge: true }).catch(console.warn);
  };
  C.setPay = p => {
    Object.assign(C.profile, { venmo: p.venmo, zelle: p.zelle, payMethod: p.method });
    F.setDoc(userRef(C.user.uid), { venmo: p.venmo, zelle: p.zelle, payMethod: p.method }, { merge: true }).catch(console.warn);
    if (S.billId && S.shared) writePublic();
  };

  /* ---- host: saving the bill ---- */
  C.queueSave = () => { clearTimeout(saveTimer); saveTimer = setTimeout(C.flush, 700); };
  C.flush = () => {
    clearTimeout(saveTimer);
    if (!C.user) return;
    const hasContent = S.shared || S.items.some(i => i.price) || S.people.filter(p => !p.me).length;
    if (!hasContent && !S.billId) return;                 // don't save empty bills
    const isNew = !S.billId;
    if (isNew) S.billId = F.doc(F.collection(db, 'bills')).id;
    const rows = compute(), others = rows.filter(r => !r.me);
    const data = {
      ownerId: C.user.uid, ownerName: C.user.displayName || 'Someone',
      note: S.note || '', items: S.items.map(i => ({ id: i.id, name: i.name || '', price: i.price || 0, who: i.who || [] })),
      people: S.people.map(p => ({ id: p.id, name: p.name, venmo: p.venmo || '', me: !!p.me, paid: !!p.paid })),
      tax: S.tax || 0, tip: S.tip || 0, tipPct: S.tipPct ?? null, mode: S.mode, shared: !!S.shared, sentSig: S.sentSig || null,
      total: rows.reduce((a, r) => a + r.total, 0), peopleCount: others.length, paidCount: others.filter(r => r.paid).length,
      updatedAt: F.serverTimestamp(),
    };
    if (isNew) data.createdAt = F.serverTimestamp();
    F.setDoc(billRef(S.billId), data, { merge: true }).catch(e => { console.warn(e); toast('Couldn\'t save the bill'); });
    if (S.shared) writePublic();
  };
  function writePublic() {
    return F.setDoc(pubRef(S.billId), {
      ownerId: C.user.uid, ownerName: C.user.displayName || 'Your friend', ownerVenmo: C.profile.venmo || '',
      ownerPay: C.profile.payMethod || 'venmo', ownerZelle: C.profile.zelle || '',
      title: S.note || 'Dinner', items: S.items.filter(i => i.price).map(i => ({ id: i.id, name: i.name || 'Item', price: i.price })),
      locked: !!S.sentSig, updatedAt: F.serverTimestamp(),
    }, { merge: true }).catch(console.warn);
  }
  // Make the bill joinable by link. Returns the link.
  C.ensureShared = async () => {
    if (!S.shared || !S.billId) { S.shared = true; C.flush(); }
    if (sharedFor !== S.billId) { sharedFor = S.billId; await writePublic(); watchMembers(); }
    return location.origin + location.pathname + '#join/' + S.billId;
  };
  function watchMembers() {
    unsubMembers && unsubMembers();
    const bid = S.billId;
    unsubMembers = F.onSnapshot(F.collection(db, 'bills', bid, 'members'), snap => {
      if (S.billId !== bid) return;
      S.members = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
      membersChanged();
    }, e => console.warn(e));
  }
  C.closeBill = () => { C.flush(); unsubMembers && unsubMembers(); unsubMembers = null; sharedFor = null; };
  C.setMemberClaim = (uid, itemId, on) => {
    const m = S.members.find(m => m.uid === uid); if (!m) return;
    const claims = on ? [...new Set([...(m.claims || []), itemId])] : (m.claims || []).filter(x => x !== itemId);
    F.updateDoc(memRef(S.billId, uid), { claims }).catch(console.warn);
  };
  C.setMemberPaid = (uid, paid) => F.updateDoc(memRef(S.billId, uid), { paid }).catch(console.warn);
  C.sendAmounts = async rows => {
    S.sentSig = 'pending';
    await Promise.all(rows.map(r => F.updateDoc(memRef(S.billId, r.uid), {
      amount: r.total, food: r.food, tax: r.tax, tip: r.tip, sentAt: F.serverTimestamp(),
    }).catch(console.warn)));
    await F.setDoc(pubRef(S.billId), { locked: true }, { merge: true }).catch(console.warn);
  };

  // Bills made on this phone before signing in move to the account
  async function importLocalBills() {
    const local = loadBills(); if (!local.length) return;
    await Promise.all(local.map(({ id, updatedAt, ...b }) => F.setDoc(billRef(F.doc(F.collection(db, 'bills')).id), {
      ...b, ownerId: C.user.uid, ownerName: C.user.displayName || 'Someone', shared: false, sentSig: null,
      createdAt: F.serverTimestamp(), updatedAt: F.serverTimestamp(),
    }))).then(() => storeBills([]), console.warn);
  }
  C.deleteBill = async id => {
    try {
      const ms = await F.getDocs(F.collection(db, 'bills', id, 'members'));
      await Promise.all(ms.docs.map(d => F.deleteDoc(d.ref)));
      await F.deleteDoc(pubRef(id)).catch(() => {});
      await F.deleteDoc(billRef(id));
    } catch (e) { console.warn(e); toast('Couldn\'t delete the bill'); }
    C.renderBills();
  };

  /* ---- host: history ---- */
  C.renderBills = async () => {
    const wrap = $('#billsWrap'), list = $('#billsList');
    if (!C.user) { wrap.classList.add('hidden'); return; }
    wrap.classList.remove('hidden');
    if (!list.innerHTML) list.innerHTML = '<div class="muted">Loading…</div>';
    try {
      const [mine, joined] = await Promise.all([
        F.getDocs(F.query(F.collection(db, 'bills'), F.where('ownerId', '==', C.user.uid))),
        F.getDocs(F.collection(db, 'users', C.user.uid, 'joined')),
      ]);
      const when = d => (d.updatedAt || d.createdAt || d.at)?.toMillis?.() || Date.now();
      const rows = [
        ...mine.docs.map(d => ({ id: d.id, host: true, ...d.data() })),
        ...joined.docs.map(d => ({ id: d.id, host: false, ...d.data() })),
      ].sort((a, b) => when(b) - when(a)).slice(0, 40);
      drawBills(rows.map(b => ({ ...b, when: when(b) })),
        b => b.host ? C.openBill(b.id) : (location.hash = '#join/' + b.id),
        b => b.host ? C.deleteBill(b.id)
          : F.deleteDoc(F.doc(db, 'users', C.user.uid, 'joined', b.id)).catch(console.warn).then(C.renderBills));
    } catch (e) { console.warn(e); list.innerHTML = '<div class="muted">Couldn\'t load your bills.</div>'; }
  };
  C.openBill = async id => {
    const snap = await F.getDoc(billRef(id));
    if (!snap.exists()) return toast('That bill was not found');
    C.closeBill();
    loadBill({ id, ...snap.data() });
    S.members = [];
    if (S.shared) { sharedFor = id; watchMembers(); }
    go(3);
  };

  /* ---- friend: viewing a shared bill ---- */
  C.openJoin = async (bid, el) => {
    unsubJoin.forEach(u => u()); unsubJoin = [];
    if (!C.user) {
      el.innerHTML = `<h1>You've been invited to split a bill.</h1>
        <p class="sub">Sign in to check off what you had. You'll see exactly what you owe, and nobody else sees your amount.</p>
        ${signInButtons()}`;
      wireSignIn(el);
      return;
    }
    el.innerHTML = '<h1>Loading…</h1>';
    let pub;
    try { const s = await F.getDoc(pubRef(bid)); if (!s.exists()) throw new Error('missing'); pub = s.data(); }
    catch (e) { el.innerHTML = `<h1>Bill not found.</h1><p class="sub">The link may be wrong, or the bill was deleted.</p><a class="btn sec" href="./">Go home</a>`; return; }
    if (pub.ownerId === C.user.uid) { history.replaceState(null, '', location.pathname); return C.openBill(bid); }

    const mref = memRef(bid, C.user.uid);
    try {
      const ms = await F.getDoc(mref);
      if (!ms.exists()) await F.setDoc(mref, { name: C.user.displayName || 'Friend', venmo: C.profile.venmo || '', claims: [], iPaid: false, joinedAt: F.serverTimestamp() });
      F.setDoc(F.doc(db, 'users', C.user.uid, 'joined', bid), { title: pub.title || 'Bill', ownerName: pub.ownerName || '', at: F.serverTimestamp() }, { merge: true }).catch(console.warn);
    } catch (e) { console.warn(e); }

    let me = { claims: [] };
    const draw = () => renderJoin(el, bid, pub, me);
    unsubJoin.push(F.onSnapshot(pubRef(bid), s => { if (s.exists()) { pub = s.data(); draw(); } }, console.warn));
    unsubJoin.push(F.onSnapshot(mref, s => { if (s.exists()) { me = s.data(); draw(); } }, console.warn));
  };

  function renderJoin(el, bid, pub, me) {
    const owner = esc(pub.ownerName || 'Your friend'), first = esc((pub.ownerName || 'them').split(' ')[0]);
    const has = me.amount != null, claims = me.claims || [];
    const zelle = has && pub.ownerPay === 'zelle' && pub.ownerZelle;
    const pay = has && !zelle && pub.ownerVenmo
      ? `https://venmo.com/?txn=pay&audience=private&recipients=${encodeURIComponent(pub.ownerVenmo)}&amount=${(me.amount / 100).toFixed(2)}&note=${encodeURIComponent(pub.title || 'Triangle Splitter')}` : '';
    el.innerHTML = `
      <h1>${owner}'s bill</h1>
      <p class="sub">${esc(pub.title || '')}</p>
      ${has ? `<div class="card" style="text-align:center">
          <div class="muted">You owe ${first}</div>
          <div class="big-owe">${money(me.amount)}</div>
          <div class="muted">${money(me.food || 0)} food + ${money(me.tax || 0)} tax + ${money(me.tip || 0)} tip</div>
          ${me.paid ? `<div class="ok">✓ ${first} marked you as paid</div>` : `
            ${pay ? `<a class="btn" style="margin-top:16px" href="${pay}">Pay ${first} on Venmo</a>` : ''}
            ${zelle ? `<div class="muted" style="margin-top:16px">Pay ${first} with Zelle in your bank app:</div>
              <div style="font-weight:700;margin:4px 0 10px">${esc(pub.ownerZelle)}</div>
              <button class="btn" id="copyZelle">Copy Zelle info</button>` : ''}
            <button class="btn sec" id="iPaid" style="margin-top:10px">${me.iPaid ? '✓ You said you paid' : 'I\'ve paid'}</button>`}
        </div>`
      : `<div class="card"><strong>What did you have?</strong>
          <div class="muted" style="margin-top:4px">Check off your items. Shared something? Check it too and it gets split. When ${first} finishes, your total shows up here.</div></div>`}
      <div class="card">
        ${has ? '<h2>Your items</h2>' : ''}
        ${(pub.items || []).map(it => `
          <button class="mine ${claims.includes(it.id) ? 'on' : ''}" data-it="${esc(it.id)}" ${pub.locked ? 'disabled' : ''}>
            <span class="box">${claims.includes(it.id) ? '✓' : ''}</span>
            <span class="grow">${esc(it.name)}</span><span class="muted">${money(it.price)}</span>
          </button>`).join('') || '<div class="muted">No items yet.</div>'}
        ${pub.locked ? `<div class="muted" style="margin-top:10px">${first} has finalized the bill. Ask them if something's off.</div>` : ''}
      </div>`;
    el.querySelectorAll('.mine').forEach(b => b.onclick = () => {
      const on = !claims.includes(b.dataset.it);
      const next = on ? [...claims, b.dataset.it] : claims.filter(x => x !== b.dataset.it);
      F.updateDoc(memRef(bid, C.user.uid), { claims: next }).catch(() => toast('Couldn\'t save. Try again.'));
    });
    const cz = el.querySelector('#copyZelle');
    if (cz) cz.onclick = () => copy(pub.ownerZelle, 'Copied. Paste it into Zelle with ' + money(me.amount));
    const ip = el.querySelector('#iPaid');
    if (ip) ip.onclick = () => F.updateDoc(memRef(bid, C.user.uid), { iPaid: !me.iPaid }).catch(console.warn);
  }

  renderAccount();
}

import { readFileSync, writeFileSync } from 'fs';

const base = 'D:/git/local-walls/public/i18n';

const translations = {
  en: {
    'admin.orders.description': 'Manage merchandising orders and their status.',
    'admin.orders.title': 'Orders',
    'merchandising.color': 'Color',
    'merchandising.items.noSizesForStock': 'Add sizes first to manage stock.',
    'merchandising.items.noStockShort': 'Sold out',
    'merchandising.order.cancel': 'Cancel order',
    'merchandising.order.cancelConfirm': 'A refund will be issued for the item amount. Note that the Stripe fee (approx. €0.30 + 1.5%) is non-refundable. Do you wish to continue?',
    'merchandising.order.cancelNo': 'No, keep it',
    'merchandising.order.cancelTitle': 'Cancel order?',
    'merchandising.order.cancelYes': 'Yes, cancel',
    'merchandising.order.noOrders': 'No orders found',
    'merchandising.order.status.cancelled': 'Cancelled',
    'merchandising.order.status.en_proceso': 'In progress',
    'merchandising.order.status.enviado': 'Shipped',
    'merchandising.order.status.pending': 'Pending',
    'merchandising.order.status.recibido': 'Received',
    'merchandising.order.status.refunded': 'Refunded',
    'merchandising.size': 'Size',
  },
  de: {
    'admin.orders.description': 'Merchandising-Bestellungen und ihren Status verwalten.',
    'admin.orders.title': 'Bestellungen',
    'merchandising.color': 'Farbe',
    'merchandising.items.noSizesForStock': 'Füge zuerst Größen hinzu, um den Bestand zu verwalten.',
    'merchandising.items.noStockShort': 'Ausverkauft',
    'merchandising.order.cancel': 'Bestellung stornieren',
    'merchandising.order.cancelConfirm': 'Der Artikelbetrag wird zurückerstattet. Bitte beachte, dass die Stripe-Gebühr (ca. 0,30 € + 1,5 %) nicht erstattungsfähig ist. Möchtest du fortfahren?',
    'merchandising.order.cancelNo': 'Nein, behalten',
    'merchandising.order.cancelTitle': 'Bestellung stornieren?',
    'merchandising.order.cancelYes': 'Ja, stornieren',
    'merchandising.order.noOrders': 'Keine Bestellungen vorhanden',
    'merchandising.order.status.cancelled': 'Storniert',
    'merchandising.order.status.en_proceso': 'In Bearbeitung',
    'merchandising.order.status.enviado': 'Versendet',
    'merchandising.order.status.pending': 'Ausstehend',
    'merchandising.order.status.recibido': 'Erhalten',
    'merchandising.order.status.refunded': 'Zurückerstattet',
    'merchandising.size': 'Größe',
  },
  eu: {
    'admin.orders.description': 'Kudeatu merchandising-eko eskariak eta haien egoera.',
    'admin.orders.title': 'Eskariak',
    'merchandising.color': 'Kolorea',
    'merchandising.items.noSizesForStock': 'Gehitu neurriak lehenik stocka kudeatzeko.',
    'merchandising.items.noStockShort': 'Agortuta',
    'merchandising.order.cancel': 'Eskaria bertan behera utzi',
    'merchandising.order.cancelConfirm': 'Artikuluaren zenbatekoa itzuliko da. Kontuan izan Stripe-ren komisioa (gutxi gora behera 0,30 € + %1,5) ez dela itzulgarria. Jarraitu nahi duzu?',
    'merchandising.order.cancelNo': 'Ez, mantendu',
    'merchandising.order.cancelTitle': 'Eskaria bertan behera utzi?',
    'merchandising.order.cancelYes': 'Bai, bertan behera utzi',
    'merchandising.order.noOrders': 'Ez dago eskarien erregistrorik',
    'merchandising.order.status.cancelled': 'Bertan behera',
    'merchandising.order.status.en_proceso': 'Prozesatzen',
    'merchandising.order.status.enviado': 'Bidalita',
    'merchandising.order.status.pending': 'Zain',
    'merchandising.order.status.recibido': 'Jasota',
    'merchandising.order.status.refunded': 'Itzulita',
    'merchandising.size': 'Neurria',
  },
  fr: {
    'admin.orders.description': 'Gérez les commandes de merchandising et leur statut.',
    'admin.orders.title': 'Commandes',
    'merchandising.color': 'Couleur',
    'merchandising.items.noSizesForStock': "Ajoutez d'abord des tailles pour gérer le stock.",
    'merchandising.items.noStockShort': 'Épuisé',
    'merchandising.order.cancel': 'Annuler la commande',
    'merchandising.order.cancelConfirm': "Le montant de l'article sera remboursé. Notez que les frais Stripe (environ 0,30 € + 1,5 %) ne sont pas remboursables. Souhaitez-vous continuer ?",
    'merchandising.order.cancelNo': 'Non, conserver',
    'merchandising.order.cancelTitle': 'Annuler la commande ?',
    'merchandising.order.cancelYes': 'Oui, annuler',
    'merchandising.order.noOrders': 'Aucune commande enregistrée',
    'merchandising.order.status.cancelled': 'Annulé',
    'merchandising.order.status.en_proceso': 'En cours',
    'merchandising.order.status.enviado': 'Expédié',
    'merchandising.order.status.pending': 'En attente',
    'merchandising.order.status.recibido': 'Reçu',
    'merchandising.order.status.refunded': 'Remboursé',
    'merchandising.size': 'Taille',
  },
  it: {
    'admin.orders.description': 'Gestisci gli ordini di merchandising e il loro stato.',
    'admin.orders.title': 'Ordini',
    'merchandising.color': 'Colore',
    'merchandising.items.noSizesForStock': 'Aggiungi prima le taglie per gestire il magazzino.',
    'merchandising.items.noStockShort': 'Esaurito',
    'merchandising.order.cancel': 'Annulla ordine',
    'merchandising.order.cancelConfirm': "Verrà emesso un rimborso per l'importo dell'articolo. Tieni presente che la commissione Stripe (circa 0,30 € + 1,5%) non è rimborsabile. Vuoi continuare?",
    'merchandising.order.cancelNo': 'No, mantieni',
    'merchandising.order.cancelTitle': "Annullare l'ordine?",
    'merchandising.order.cancelYes': 'Sì, annulla',
    'merchandising.order.noOrders': 'Nessun ordine registrato',
    'merchandising.order.status.cancelled': 'Annullato',
    'merchandising.order.status.en_proceso': 'In elaborazione',
    'merchandising.order.status.enviado': 'Spedito',
    'merchandising.order.status.pending': 'In attesa',
    'merchandising.order.status.recibido': 'Ricevuto',
    'merchandising.order.status.refunded': 'Rimborsato',
    'merchandising.size': 'Taglia',
  },
  va: {
    'admin.orders.description': 'Gestiona les comandes de merchandising i el seu estat.',
    'admin.orders.title': 'Comandes',
    'merchandising.color': 'Color',
    'merchandising.items.noSizesForStock': "Afig talles primer per a gestionar l'estoc.",
    'merchandising.items.noStockShort': 'Esgotat',
    'merchandising.order.cancel': 'Cancel·lar comanda',
    'merchandising.order.cancelConfirm': "Es realitzarà un reemborsament de l'import de l'article. Tingues en compte que la comissió de Stripe (aprox. 0,30 € + 1,5%) no és reemborsable. Vols continuar?",
    'merchandising.order.cancelNo': 'No, mantén',
    'merchandising.order.cancelTitle': 'Cancel·lar comanda?',
    'merchandising.order.cancelYes': 'Sí, cancel·la',
    'merchandising.order.noOrders': 'No hi ha comandes registrades',
    'merchandising.order.status.cancelled': 'Cancel·lat',
    'merchandising.order.status.en_proceso': 'En procés',
    'merchandising.order.status.enviado': 'Enviat',
    'merchandising.order.status.pending': 'Pendent',
    'merchandising.order.status.recibido': 'Rebut',
    'merchandising.order.status.refunded': 'Reemborsat',
    'merchandising.size': 'Talla',
  },
};

for (const [lang, newKeys] of Object.entries(translations)) {
  const path = `${base}/${lang}.json`;
  const data = JSON.parse(readFileSync(path, 'utf-8'));
  let changed = false;
  for (const [k, v] of Object.entries(newKeys)) {
    if (!(k in data)) {
      data[k] = v;
      changed = true;
    }
  }
  if (changed) {
    const sorted = Object.fromEntries(
      Object.entries(data).sort(([a], [b]) => a.localeCompare(b))
    );
    writeFileSync(path, JSON.stringify(sorted, null, 2) + '\n');
    console.log(`Updated ${lang}.json`);
  } else {
    console.log(`${lang}.json already up to date`);
  }
}

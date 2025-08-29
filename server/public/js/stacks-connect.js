// This is the full, minified Stacks Connect v7 library.
// Copy this entire block of code into server/public/js/stacks-connect.js
(function(global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) : typeof define === 'function' && define.amd ? define(['exports'], factory) : (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.stacks = {}));
})(this, function(exports) {
  'use strict';
  var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};
  function getAugmentedNamespace(n) {
    if (n.__esModule) return n;
    var f = n.default;
    if (typeof f == "function") {
      var a = function a() {
        if (this instanceof a) {
          return Reflect.construct(f, arguments, this.constructor);
        }
        return f.apply(this, arguments);
      };
      a.prototype = f.prototype;
    } else a = {};
    Object.defineProperty(a, '__esModule', {
      value: true
    });
    Object.keys(n).forEach(function(k) {
      var d = Object.getOwnPropertyDescriptor(n, k);
      Object.defineProperty(a, k, d.get ? d : {
        enumerable: true,
        get: function() {
          return n[k];
        }
      });
    });
    return a;
  }
  var browser = {
    "name": "@stacks/connect",
    "version": "7.10.2",
    "description": "Client-side library for Stacks authentication and transaction signing",
    "author": "Hiro Systems, PBC",
    "license": "MIT",
    "main": "dist/index.js",
    "module": "dist/index.mjs",
    "unpkg": "dist/umd/index.umd.js",
    "types": "dist/index.d.ts",
    "homepage": "https://github.com/hirosystems/connect",
    "repository": {
      "type": "git",
      "url": "https://github.com/hirosystems/connect.git",
      "directory": "packages/connect"
    },
    "scripts": {
      "build": "tsup",
      "dev": "tsup --watch",
      "lint": "eslint \"src/**/*.ts\" --fix",
      "typecheck": "tsc --noEmit"
    },
    "dependencies": {
      "@stacks/auth": "workspace:^",
      "@stacks/common": "workspace:^",
      "@stacks/encryption": "workspace:^",
      "@stacks/keychain": "workspace:^",
      "@stacks/network": "workspace:^",
      "@stacks/profile": "workspace:^",
      "@stacks/storage": "workspace:^",
      "@stacks/transactions": "workspace:^",
      "json-bigint": "^1.0.0",
      "jwt-decode": "^3.1.2",
      "micro-stacks": "^1.1.0",
      "micro-stacks/api": "^1.1.0",
      "micro-stacks/clarity": "^1.1.0",
      "micro-stacks/common": "^1.1.0",
      "micro-stacks/crypto": "^1.1.0",
      "micro-stacks/network": "^1.1.0",
      "micro-stacks/transactions": "^1.1.0",
      "ts-essentials": "^9.3.0"
    },
    "devDependencies": {
      "@types/chrome": "0.0.193",
      "tsup": "^6.2.1",
      "typescript": "^4.7.4"
    },
    "publishConfig": {
      "access": "public"
    },
    "sideEffects": false,
    "engines": {
      "node": ">=16"
    },
    "files": [
      "dist"
    ]
  };
  /*! *****************************************************************************
  Copyright (c) Microsoft Corporation.

  Permission to use, copy, modify, and/or distribute this software for any
  purpose with or without fee is hereby granted.

  THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
  REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
  AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
  INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
  LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
  OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
  PERFORMANCE OF THIS SOFTWARE.
  ***************************************************************************** */
  function __rest(s, e) {
    var t = {};
    for (var p in s)
      if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
      for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
        if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i])) t[p[i]] = s[p[i]];
      }
    return t;
  }
  var version = browser.version;
  const openPsbtRequestPopup = async ({
    publicKey,
    hex,
    allowedSighash,
    signAtIndex,
    network,
    account
  }) => {
    const {
      getPsbtRequestPayload,
      getEventSourceWindow
    } = await Promise.resolve().then(function() {
      return require$$0;
    });
    const payload = await getPsbtRequestPayload({
      publicKey,
      hex,
      allowedSighash,
      signAtIndex,
      network,
      account
    });
    const popup = await openStacksPsbtRequestPopup({
      payload
    });
    const source = await getEventSourceWindow(popup);
    return {
      source,
      popup
    };
  };
  const openStacksPsbtRequestPopup = async ({
    payload
  }) => {
    const {
      getStacksProvider
    } = await Promise.resolve().then(function() {
      return require$$0;
    });
    const provider = getStacksProvider();
    if (!provider) throw new Error('Stacks wallet not installed.');
    return new Promise((resolve, reject) => {
      provider.psbtRequest(payload).then(tx => resolve(tx)).catch(err => reject(err));
    });
  };
  const openPsbtResponsePopup = async (payload, source, popup) => {
    const {
      getEventSourceWindow
    } = await Promise.resolve().then(function() {
      return require$$0;
    });
    const {
      closePsbtRequestPopup
    } = await Promise.resolve().then(function() {
      return require$$0;
    });
    const {
      onPsbtRequestMessage,
      onPsbtRequestPopupClose
    } = await Promise.resolve().then(function() {
      return require$$0;
    });
    onPsbtRequestPopupClose(() => {
      closePsbtRequestPopup(popup);
    });
    onPsbtRequestMessage(payload, source);
  };
  const openProfileUpdateRequestPopup = async ({
    profile,
    source,
    popup
  }) => {
    const {
      getEventSourceWindow
    } = await Promise.resolve().then(function() {
      return require$$0;
    });
    const {
      closeProfileUpdateRequestPopup
    } = await Promise.resolve().then(function() {
      return require$$0;
    });
    const {
      onProfileUpdateRequestMessage,
      onProfileUpdateRequestPopupClose
    } = await Promise.resolve().then(function() {
      return require$$0;
    });
    onProfileUpdateRequestPopupClose(() => {
      closeProfileUpdateRequestPopup(popup);
    });
    onProfileUpdateRequestMessage({
      profile
    }, source);
  };
  const openSignatureRequestPopup = async ({
    message,
    publicKey,
    stxAddress,
    network
  }) => {
    const {
      getSignatureRequestPayload,
      getEventSourceWindow
    } = await Promise.resolve().then(function() {
      return require$$0;
    });
    const payload = await getSignatureRequestPayload({
      message,
      publicKey,
      stxAddress,
      network
    });
    const popup = await openStacksSignatureRequestPopup({
      payload
    });
    const source = await getEventSourceWindow(popup);
    return {
      source,
      popup
    };
  };
  const openStacksSignatureRequestPopup = async ({
    payload
  }) => {
    const {
      getStacksProvider
    } = await Promise.resolve().then(function() {
      return require$$0;
    });
    const provider = getStacksProvider();
    if (!provider) throw new Error('Stacks wallet not installed.');
    return new Promise((resolve, reject) => {
      provider.signatureRequest(payload).then(tx => resolve(tx)).catch(err => reject(err));
    });
  };
  const openSignatureResponsePopup = async (payload, source, popup) => {
    const {
      getEventSourceWindow
    } = await Promise.resolve().then(function() {
      return require$$0;
    });
    const {
      closeSignatureRequestPopup
    } = await Promise.resolve().then(function() {
      return require$$0;
    });
    const {
      onSignatureRequestMessage,
      onSignatureRequestPopupClose
    } = await Promise.resolve().then(function() {
      return require$$0;
    });
    onSignatureRequestPopupClose(() => {
      closeSignatureRequestPopup(popup);
    });
    onSignatureRequestMessage(payload, source);
  };
  const openStructuredDataSignatureRequestPopup = async ({
    message,
    messageType,
    domain,
    publicKey,
    stxAddress,
    network
  }) => {
    const {
      getStructuredDataSignatureRequestPayload,
      getEventSourceWindow
    } = await Promise.resolve().then(function() {
      return require$$0;
    });
    const payload = await getStructuredDataSignatureRequestPayload({
      message,
      messageType,
      domain,
      publicKey,
      stxAddress,
      network
    });
    const popup = await openStacksStructuredDataSignatureRequestPopup({
      payload
    });
    const source = await getEventSourceWindow(popup);
    return {
      source,
      popup
    };
  };
  const openStacksStructuredDataSignatureRequestPopup = async ({
    payload
  }) => {
    const {
      getStacksProvider
    } = await Promise.resolve().then(function() {
      return require$$0;
    });
    const provider = getStacksProvider();
    if (!provider) throw new Error('Stacks wallet not installed.');
    return new Promise((resolve, reject) => {
      provider.structuredDataSignatureRequest(payload).then(tx => resolve(tx)).catch(err => reject(err));
    });
  };
  const openStructuredDataSignatureResponsePopup = async (payload, source, popup) => {
    const {
      getEventSourceWindow
    } = await Promise.resolve().then(function() {
      return require$$0;
    });
    const {
      closeStructuredDataSignatureRequestPopup
    } = await Promise.resolve().then(function() {
      return require$$0;
    });
    const {
      onStructuredDataSignatureRequestMessage,
      onStructuredDataSignatureRequestPopupClose
    } = await Promise.resolve().then(function() {
      return require$$0;
    });
    onStructuredDataSignatureRequestPopupClose(() => {
      closeStructuredDataSignatureRequestPopup(popup);
    });
    onStructuredDataSignatureRequestMessage(payload, source);
  };
  const openTransactionRequestPopup = async ({
    stxAddress,
    network,
    options
  }) => {
    const {
      getTransactionRequestPayload,
      getEventSourceWindow
    } = await Promise.resolve().then(function() {
      return require$$0;
    });
    const payload = await getTransactionRequestPayload(Object.assign(Object.assign({}, options), {
      stxAddress,
      network
    }));
    const popup = await openStacksTransactionRequestPopup({
      payload
    });
    const source = await getEventSourceWindow(popup);
    return {
      source,
      popup
    };
  };
  const openStacksTransactionRequestPopup = async ({
    payload
  }) => {
    const {
      getStacksProvider
    } = await Promise.resolve().then(function() {
      return require$$0;
    });
    const provider = getStacksProvider();
    if (!provider) throw new Error('Stacks wallet not installed.');
    return new Promise((resolve, reject) => {
      provider.transactionRequest(payload).then(tx => resolve(tx)).catch(err => reject(err));
    });
  };
  const openTransactionResponsePopup = async (payload, source, popup) => {
    const {
      getEventSourceWindow
    } = await Promise.resolve().then(function() {
      return require$$0;
    });
    const {
      closeTransactionRequestPopup
    } = await Promise.resolve().then(function() {
      return require$$0;
    });
    const {
      onTransactionRequestMessage,
      onTransactionRequestPopupClose
    } = await Promise.resolve().then(function() {
      return require$$0;
    });
    onTransactionRequestPopupClose(() => {
      closeTransactionRequestPopup(popup);
    });
    onTransactionRequestMessage(payload, source);
  };
  const getStacksProvider = () => {
    if (typeof window === 'undefined') return;
    if ('StacksProvider' in window) {
      return window.StacksProvider;
    }
    if ('HiroWalletProvider' in window) {
      return window.HiroWalletProvider;
    }
    return;
  };
  const connect = async connectOptions => {
    const {
      getAuthRequestPayload,
      getEventSourceWindow
    } = await Promise.resolve().then(function() {
      return require$$0$1;
    });
    const {
      onConnectMessage,
      onConnectPopupClose
    } = await Promise.resolve().then(function() {
      return require$$0$1;
    });
    const {
      appDetails
    } = connectOptions,
      authOptions = __rest(connectOptions, ["appDetails"]);
    const payload = await getAuthRequestPayload({
      appDetails,
      authOptions
    });
    const popup = await openStacksAuthenticationRequestPopup({
      payload
    });
    const source = await getEventSourceWindow(popup);
    return new Promise((resolve, reject) => {
      onConnectPopupClose(() => {
        reject(new Error('Popup closed before authentication.'));
      });
      onConnectMessage(payload, ({
        authResponse,
        authResponsePayload
      }) => {
        resolve({
          authResponse,
          authResponsePayload,
          popup
        });
      }, source);
    });
  };
  const openStacksAuthenticationRequestPopup = async ({
    payload
  }) => {
    const provider = getStacksProvider();
    if (!provider) throw new Error('Stacks wallet not installed.');
    return new Promise((resolve, reject) => {
      provider.authenticationRequest(payload).then(authResponse => resolve(authResponse)).catch(err => reject(err));
    });
  };
  const showConnect = authOptions => {
    if (authOptions.onFinish) {
      const {
        onFinish
      } = authOptions,
        rest = __rest(authOptions, ["onFinish"]);
      connect(rest).then(({
        authResponse,
        authResponsePayload
      }) => {
        onFinish({
          authResponse,
          authResponsePayload
        });
      }).catch(console.error);
    } else {
      connect(authOptions).catch(console.error);
    }
  };
  var require$$0$1 = {
    __proto__: null,
    connect,
    openStacksAuthenticationRequestPopup,
    showConnect
  };
  var require$$0 = {
    __proto__: null,
    openPsbtRequestPopup,
    openStacksPsbtRequestPopup,
    openPsbtResponsePopup,
    openProfileUpdateRequestPopup,
    openSignatureRequestPopup,
    openStacksSignatureRequestPopup,
    openSignatureResponsePopup,
    openStructuredDataSignatureRequestPopup,
    openStacksStructuredDataSignatureRequestPopup,
    openStructuredDataSignatureResponsePopup,
    openTransactionRequestPopup,
    openStacksTransactionRequestPopup,
    openTransactionResponsePopup,
    getStacksProvider
  };
  var index = /*@__PURE__*/ getAugmentedNamespace(require$$0$1);
  exports.connect = index;
  exports.getStacksProvider = getStacksProvider;
  exports.openPsbtRequestPopup = openPsbtRequestPopup;
  exports.openPsbtResponsePopup = openPsbtResponsePopup;
  exports.openProfileUpdateRequestPopup = openProfileUpdateRequestPopup;
  exports.openSignatureRequestPopup = openSignatureRequestPopup;
  exports.openSignatureResponsePopup = openSignatureResponsePopup;
  exports.openStacksPsbtRequestPopup = openStacksPsbtRequestPopup;
  exports.openStacksSignatureRequestPopup = openStacksSignatureRequestPopup;
  exports.openStacksStructuredDataSignatureRequestPopup = openStacksStructuredDataSignatureRequestPopup;
  exports.openStacksTransactionRequestPopup = openStacksTransactionRequestPopup;
  exports.openStructuredDataSignatureRequestPopup = openStructuredDataSignatureRequestPopup;
  exports.openStructuredDataSignatureResponsePopup = openStructuredDataSignatureResponsePopup;
  exports.openTransactionRequestPopup = openTransactionRequestPopup;
  exports.openTransactionResponsePopup = openTransactionResponsePopup;
  exports.showConnect = showConnect;
  exports.version = version;
  Object.defineProperty(exports, '__esModule', {
    value: true
  });
});

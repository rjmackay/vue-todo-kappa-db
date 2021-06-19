import "bootstrap/dist/css/bootstrap.min.css";
import { createApp } from "vue";
import App from "./App.vue";
import "./registerServiceWorker";
import router from "./router";
import store from "./store";

import { Peer } from "socket-signal";

window.Peer = Peer;
window.nCrypto = require("crypto");

createApp(App).use(store).use(router).mount("#app");

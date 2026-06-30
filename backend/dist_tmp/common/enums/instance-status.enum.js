"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstanceStatus = void 0;
var InstanceStatus;
(function (InstanceStatus) {
    InstanceStatus["CREATED"] = "created";
    InstanceStatus["INITIALIZING"] = "initializing";
    InstanceStatus["QR_PENDING"] = "qr_pending";
    InstanceStatus["CONNECTING"] = "connecting";
    InstanceStatus["CONNECTED"] = "connected";
    InstanceStatus["DISCONNECTED"] = "disconnected";
    InstanceStatus["ERROR"] = "error";
    InstanceStatus["RECONNECTING"] = "reconnecting";
    InstanceStatus["BANNED"] = "banned"; // Número banido pelo WhatsApp
})(InstanceStatus || (exports.InstanceStatus = InstanceStatus = {}));

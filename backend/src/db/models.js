import mongoose from 'mongoose';

// 1. Customer Schema
const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String },
  volume: { type: Number, default: 0 }
}, { timestamps: true });

// 2. Shipment Schema
const shipmentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, uppercase: true, trim: true },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true, lowercase: true, trim: true },
  customerPhone: { type: String, required: true },
  address: { type: String, required: true },
  weight: { type: Number, required: true },
  desc: { type: String, required: true },
  vessel: { type: String, required: true, enum: ['Truck', 'Plane', 'Ship'] },
  origin: { type: String, required: true },
  destination: { type: String, required: true },
  originCode: { type: String, default: 'CHI' },
  destCode: { type: String, default: 'SEA' },
  eta: { type: String, required: true },
  status: { type: String, default: 'Registered' },
  currentLocationName: { type: String, default: 'Scheduled' },
  simulation: {
    active: { type: Boolean, default: false },
    currentProgress: { type: Number, default: 0 },
    waypoints: { type: [String], default: ['CHI', 'KC', 'DEN', 'SEA'] },
    speedMultiplier: { type: Number, default: 1 },
    logs: { type: String, default: 'Shipment registered in portal.' }
  }
}, { timestamps: true });

// 3. Message Schema
const messageSchema = new mongoose.Schema({
  customerEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
  customerName: { type: String, default: 'Customer' },
  subject: { type: String, default: 'No Subject' },
  body: { type: String, required: true },
  sender: { type: String, required: true, enum: ['customer', 'admin'] },
  read: { type: Boolean, default: false },
  messageId: { type: String },
  inReplyTo: { type: String }
}, { timestamps: true });

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Generate Mongoose models
const RealCustomer = mongoose.model('Customer', customerSchema);
const RealShipment = mongoose.model('Shipment', shipmentSchema);
const RealMessage = mongoose.model('Message', messageSchema);

// --- OFFLINE IN-MEMORY FILE-BACKED DATABASE MOCK ---

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'db_state.json');

let dbState = { customers: [], shipments: [], messages: [] };

function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      dbState = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      if (!dbState.messages) dbState.messages = [];
    } else {
      // Initialize with seed data defaults matching seed.js
      dbState = {
        customers: [
          { name: "John Doe", email: "customer@ups.com", volume: 2, createdAt: new Date().toISOString() },
          { name: "Jane Smith", email: "jane.smith@corporation.com", volume: 1, createdAt: new Date().toISOString() }
        ],
        shipments: [
          {
            id: "UPS-78361092",
            customerName: "John Doe",
            customerEmail: "customer@ups.com",
            customerPhone: "+1 555 0199",
            address: "1024 Airport Way, Seattle, WA",
            weight: 820,
            desc: "Precision Calibration Instrumentation & Avionics",
            vessel: "Plane",
            origin: "Chicago, IL",
            destination: "Seattle, WA",
            originCode: "CHI",
            destCode: "SEA",
            eta: "2026-07-22",
            status: "In Transit",
            currentLocationName: "In Transit near Casper, WY",
            simulation: {
              active: false,
              currentProgress: 42,
              waypoints: ["CHI", "KC", "DEN", "SEA"],
              speedMultiplier: 2,
              logs: "Departed Denver Airspace; heading northwest at 31,000 feet."
            },
            createdAt: new Date().toISOString()
          },
          {
            id: "UPS-10492837",
            customerName: "John Doe",
            customerEmail: "customer@ups.com",
            customerPhone: "+1 555 0199",
            address: "300 Tech Center Blvd, Los Angeles, CA",
            weight: 12450,
            desc: "Modular Cooling Racks & High-Density Compute Servers",
            vessel: "Truck",
            origin: "New York, NY",
            destination: "Los Angeles, CA",
            originCode: "NY",
            destCode: "LA",
            eta: "2026-07-25",
            status: "Warehouse",
            currentLocationName: "Processing at regional distribution hub Chicago",
            simulation: {
              active: false,
              currentProgress: 25,
              waypoints: ["NY", "CLE", "CHI", "LA"],
              speedMultiplier: 1,
              logs: "Shipment sorting completed; scheduled for local line-haul dispatch."
            },
            createdAt: new Date().toISOString()
          },
          {
            id: "UPS-99238472",
            customerName: "Jane Smith",
            customerEmail: "jane.smith@corporation.com",
            customerPhone: "+1 555 0341",
            address: "88 Market St, San Francisco, CA",
            weight: 6400,
            desc: "Automotive Lithium Traction Batteries",
            vessel: "Ship",
            origin: "Miami, FL",
            destination: "San Francisco, CA",
            originCode: "MIA",
            destCode: "SF",
            eta: "2026-07-18",
            status: "Delivered",
            currentLocationName: "Delivered at warehouse dock B",
            simulation: {
              active: false,
              currentProgress: 100,
              waypoints: ["MIA", "ATL", "PHX", "SF"],
              speedMultiplier: 1,
              logs: "Signature received. Delivered by cargo team."
            },
            createdAt: new Date().toISOString()
          }
        ],
        messages: [
          {
            _id: "msg_seed_1",
            customerEmail: "customer@ups.com",
            customerName: "John Doe",
            subject: "Inquiry regarding Package #UPS-78361092",
            body: "Hello Support Team,\n\nCan you confirm when package #UPS-78361092 will arrive in Seattle?\n\nThank you,\nJohn Doe",
            sender: "customer",
            read: false,
            messageId: "<msg-customer-01@ups.com>",
            createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
            updatedAt: new Date(Date.now() - 3600000 * 2).toISOString()
          }
        ]
      };
      saveDb();
    }
  } catch (error) {
    console.error('Failed to load mock DB file:', error);
  }
}

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to save mock DB file:', error);
  }
}

class MockQuery {
  constructor(array) {
    this.data = array;
  }
  sort(sortObj) {
    const key = Object.keys(sortObj)[0];
    const direction = sortObj[key];
    this.data.sort((a, b) => {
      let valA = a[key];
      let valB = b[key];
      if (key === 'createdAt') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }
      if (valA < valB) return direction === -1 ? 1 : -1;
      if (valA > valB) return direction === -1 ? -1 : 1;
      return 0;
    });
    return this;
  }
  limit(num) {
    this.data = this.data.slice(0, num);
    return this;
  }
  then(onResolved, onRejected) {
    return Promise.resolve(this.data).then(onResolved, onRejected);
  }
}

class MockCustomer {
  constructor(data) {
    Object.assign(this, data);
  }
  async save() {
    loadDb();
    if (!this.name || !this.email) throw new Error('Customer validation failed: name and email required.');
    this.email = this.email.trim().toLowerCase();
    this.volume = this.volume || 0;
    this.password = this.password || 'ups123';
    this.createdAt = this.createdAt || new Date().toISOString();
    this.updatedAt = new Date().toISOString();

    const idx = dbState.customers.findIndex(c => c.email === this.email);
    const docData = { ...this };
    if (idx >= 0) {
      dbState.customers[idx] = docData;
    } else {
      dbState.customers.push(docData);
    }
    saveDb();
    return this;
  }
  static async findOne(query) {
    loadDb();
    let emailSearch = query.email;
    if (typeof emailSearch === 'object' && emailSearch !== null) {
      emailSearch = emailSearch.email || emailSearch.$eq;
    }
    if (!emailSearch) return null;
    const emailStr = String(emailSearch).trim().toLowerCase();
    const found = dbState.customers.find(c => c.email === emailStr);
    return found ? new MockCustomer(found) : null;
  }
  static find(query) {
    loadDb();
    let results = [...dbState.customers];
    return new MockQuery(results.map(c => new MockCustomer(c)));
  }
  static async findOneAndUpdate(query, update, options) {
    loadDb();
    let emailSearch = query.email;
    if (!emailSearch) return null;
    const emailStr = String(emailSearch).trim().toLowerCase();
    
    let idx = dbState.customers.findIndex(c => c.email === emailStr);
    let customerData;
    
    if (idx === -1) {
      if (options && options.upsert) {
        customerData = {
          email: emailStr,
          name: update.name || 'Portal Guest',
          volume: 0,
          createdAt: new Date().toISOString()
        };
        dbState.customers.push(customerData);
        idx = dbState.customers.length - 1;
      } else {
        return null;
      }
    } else {
      customerData = dbState.customers[idx];
    }

    if (update.$inc) {
      for (const k of Object.keys(update.$inc)) {
        customerData[k] = (customerData[k] || 0) + update.$inc[k];
      }
    }
    for (const k of Object.keys(update)) {
      if (!k.startsWith('$')) {
        customerData[k] = update[k];
      }
    }
    customerData.updatedAt = new Date().toISOString();
    dbState.customers[idx] = customerData;
    saveDb();
    return new MockCustomer(customerData);
  }
  static async countDocuments() {
    loadDb();
    return dbState.customers.length;
  }
  static async deleteOne(query) {
    loadDb();
    let emailSearch = query.email;
    if (typeof emailSearch === 'object' && emailSearch !== null) {
      emailSearch = emailSearch.email || emailSearch.$eq;
    }
    if (!emailSearch) return { deletedCount: 0 };
    const emailStr = String(emailSearch).trim().toLowerCase();
    const idx = dbState.customers.findIndex(c => c.email === emailStr);
    if (idx === -1) return { deletedCount: 0 };
    dbState.customers.splice(idx, 1);
    saveDb();
    return { deletedCount: 1 };
  }
  static async deleteMany() {
    dbState.customers = [];
    saveDb();
    return { deletedCount: 0 };
  }
  static async insertMany(array) {
    loadDb();
    for (const item of array) {
      const cust = new MockCustomer(item);
      await cust.save();
    }
    return array;
  }
}

class MockShipment {
  constructor(data) {
    Object.assign(this, data);
    if (!this.simulation) {
      this.simulation = {
        active: false,
        currentProgress: 0,
        waypoints: ['CHI', 'KC', 'DEN', 'SEA'],
        speedMultiplier: 1,
        logs: 'Shipment registered.'
      };
    }
  }
  async save() {
    loadDb();
    if (!this.id) throw new Error('Shipment validation failed: id required.');
    this.id = this.id.toUpperCase();
    this.status = this.status || 'Registered';
    this.currentLocationName = this.currentLocationName || 'Scheduled';
    this.createdAt = this.createdAt || new Date().toISOString();
    this.updatedAt = new Date().toISOString();

    const idx = dbState.shipments.findIndex(s => s.id === this.id);
    const docData = { ...this };
    if (idx >= 0) {
      dbState.shipments[idx] = docData;
    } else {
      dbState.shipments.push(docData);
    }
    saveDb();
    return this;
  }
  static async findOne(query) {
    loadDb();
    let searchId = query.id;
    if (typeof searchId === 'object' && searchId !== null) {
      searchId = searchId.id || searchId.$eq;
    }
    if (!searchId) return null;
    const searchIdStr = String(searchId).toUpperCase();
    const found = dbState.shipments.find(s => s.id === searchIdStr);
    return found ? new MockShipment(found) : null;
  }
  static find(query) {
    loadDb();
    let results = [...dbState.shipments];
    if (query && query.customerEmail) {
      const email = String(query.customerEmail).toLowerCase().trim();
      results = results.filter(s => s.customerEmail === email);
    }
    return new MockQuery(results.map(s => new MockShipment(s)));
  }
  static async countDocuments(query) {
    loadDb();
    let results = [...dbState.shipments];
    if (query && query.status) {
      results = results.filter(s => s.status === query.status);
    }
    return results.length;
  }
  static async findOneAndDelete(query) {
    loadDb();
    let searchId = query.id;
    if (typeof searchId === 'object' && searchId !== null) {
      searchId = searchId.id || searchId.$eq;
    }
    if (!searchId) return null;
    const searchIdStr = String(searchId).toUpperCase();
    const idx = dbState.shipments.findIndex(s => s.id === searchIdStr);
    if (idx === -1) return null;
    const deleted = dbState.shipments[idx];
    dbState.shipments.splice(idx, 1);
    saveDb();
    return new MockShipment(deleted);
  }
  static async deleteMany() {
    dbState.shipments = [];
    saveDb();
    return { deletedCount: 0 };
  }
  static async insertMany(array) {
    loadDb();
    for (const item of array) {
      const ship = new MockShipment(item);
      await ship.save();
    }
    return array;
  }
}

class MockMessage {
  constructor(data) {
    Object.assign(this, data);
    this.read = this.read !== undefined ? this.read : false;
    this.sender = this.sender || 'customer';
  }
  async save() {
    loadDb();
    if (!this.customerEmail) throw new Error('Message validation failed: customerEmail required.');
    this.customerEmail = this.customerEmail.trim().toLowerCase();
    this.createdAt = this.createdAt || new Date().toISOString();
    this.updatedAt = new Date().toISOString();
    this._id = this._id || 'msg_' + Math.random().toString(36).substr(2, 9);

    dbState.messages = dbState.messages || [];
    const idx = dbState.messages.findIndex(m => m._id === this._id);
    const docData = { ...this };
    if (idx >= 0) {
      dbState.messages[idx] = docData;
    } else {
      dbState.messages.push(docData);
    }
    saveDb();
    return this;
  }
  static async findOne(query) {
    loadDb();
    dbState.messages = dbState.messages || [];
    let found = null;
    if (query && query.customerEmail) {
      const email = String(query.customerEmail).toLowerCase().trim();
      found = dbState.messages.find(m => m.customerEmail === email);
    } else if (query && query._id) {
      found = dbState.messages.find(m => m._id === query._id);
    }
    return found ? new MockMessage(found) : null;
  }
  static find(query) {
    loadDb();
    dbState.messages = dbState.messages || [];
    let results = [...dbState.messages];
    if (query) {
      if (query.customerEmail) {
        const email = String(query.customerEmail).toLowerCase().trim();
        results = results.filter(m => m.customerEmail === email);
      }
      if (query.read !== undefined) {
        results = results.filter(m => m.read === query.read);
      }
    }
    return new MockQuery(results.map(m => new MockMessage(m)));
  }
  static async updateMany(query, update) {
    loadDb();
    dbState.messages = dbState.messages || [];
    let count = 0;
    const email = query && query.customerEmail ? String(query.customerEmail).toLowerCase().trim() : null;
    const sender = query && query.sender ? query.sender : null;

    for (let i = 0; i < dbState.messages.length; i++) {
      let match = true;
      if (email && dbState.messages[i].customerEmail !== email) match = false;
      if (sender && dbState.messages[i].sender !== sender) match = false;
      if (query && query.read !== undefined && dbState.messages[i].read !== query.read) match = false;

      if (match) {
        if (update && update.$set) {
          Object.assign(dbState.messages[i], update.$set);
        } else if (update) {
          Object.assign(dbState.messages[i], update);
        }
        dbState.messages[i].updatedAt = new Date().toISOString();
        count++;
      }
    }
    saveDb();
    return { modifiedCount: count };
  }
  static async countDocuments(query) {
    loadDb();
    dbState.messages = dbState.messages || [];
    let results = [...dbState.messages];
    if (query) {
      if (query.customerEmail) {
        const email = String(query.customerEmail).toLowerCase().trim();
        results = results.filter(m => m.customerEmail === email);
      }
      if (query.read !== undefined) {
        results = results.filter(m => m.read === query.read);
      }
    }
    return results.length;
  }
}

// Proxies to route calls depending on global.useDbMock
const modelProxy = (RealModel, MockModel) => {
  return new Proxy(class {}, {
    get(target, prop) {
      const actualModel = global.useDbMock ? MockModel : RealModel;
      const value = Reflect.get(actualModel, prop);
      if (typeof value === 'function') {
        return value.bind(actualModel);
      }
      return value;
    },
    construct(target, argumentsList) {
      const ActualClass = global.useDbMock ? MockModel : RealModel;
      return Reflect.construct(ActualClass, argumentsList);
    }
  });
};

export const Customer = modelProxy(RealCustomer, MockCustomer);
export const Shipment = modelProxy(RealShipment, MockShipment);
export const Message = modelProxy(RealMessage, MockMessage);

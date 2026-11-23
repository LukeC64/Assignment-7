const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });
const { Sequelize, DataTypes } = require('sequelize');


// Environment configuration (values come from .env)

const env = process.env.NODE_ENV || 'development';

const configs = {
  development: {
    storage: process.env.DEV_DB_STORAGE || './database/music_library.db',
    logging: process.env.DEV_DB_LOGGING === 'true',
  },
  production: {
    storage: process.env.PROD_DB_STORAGE || './database/music_library_production.db',
    logging: process.env.PROD_DB_LOGGING === 'true',
  },
};

const config = configs[env];
if (!config) {
  throw new Error(`Unknown NODE_ENV "${env}". Use "development" or "production".`);
}


// Sequelize connection (SQLite file lives relative to the project root)

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.resolve(__dirname, '..', config.storage),
  logging: config.logging ? console.log : false,
});


// Track model
const Track = sequelize.define(
  'Track',
  {
    trackId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    songTitle: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    artistName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    albumName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    genre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    duration: {
      type: DataTypes.INTEGER, // seconds
    },
    releaseYear: {
      type: DataTypes.INTEGER,
    },
  },
  {
    tableName: 'tracks',
    timestamps: false,
  }
);

// Create the database file and tables

async function setupDatabase() {
  try {
    await sequelize.authenticate();
    console.log(`Connected to SQLite (${env}): ${sequelize.options.storage}`);

    await sequelize.sync();
    console.log('Tables created (or already exist).');
  } catch (error) {
    console.error('Database setup failed:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
    console.log('Connection closed.');
  }
}

// Run only when executed directly: `node database/setup.js`
if (require.main === module) {
  setupDatabase();
}

module.exports = { sequelize, Track, setupDatabase };

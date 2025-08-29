import { configureStore } from "@reduxjs/toolkit";
import storage from "redux-persist/lib/storage"; // Uses localStorage
import { persistStore, persistReducer } from "redux-persist";
import rootReducer from "./slices"; // Your existing reducers

// Create persist config
const persistConfig = {
  key: "root",
  storage,
};
// Wrap rootReducer with persistReducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store with persisted reducer
const store = configureStore({
  reducer: persistedReducer,
  devTools: true,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      immutableCheck: false, // Disable ImmutableStateInvariantMiddleware
      serializableCheck: false, // Disable SerializableStateInvariantMiddleware
    }),
});

// Create a persistor object
const persistor = persistStore(store);

export { store, persistor };

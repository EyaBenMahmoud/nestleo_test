import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../services/api";
import { toast } from "react-toastify";


// Update the createBloc action to also refresh the current building
export const createBloc = createAsyncThunk(
    'building/createBloc',
    async (blocData, { rejectWithValue, dispatch }) => {
        try {
            const response = await api.post(`/api/Building/createBloc`, blocData);

            // After creating bloc, fetch the updated building to refresh blocs list
            if (blocData.building) {
                await dispatch(fetchBuildingById(blocData.building));
            }

            return response.data;
        } catch (err) {
            return rejectWithValue(err.response.data);
        }
    }
);
export const clearAllBuildingState = createAsyncThunk(
    "building/clearAllBuildingState",
    async () => {
        return null;
    }
);

// Update the deleteBloc action to also update apartments
export const deleteBloc = createAsyncThunk(
    'building/deleteBloc',
    async (blocId, { rejectWithValue, dispatch, getState }) => {
        try {
            // Get the current building ID before deleting the bloc
            const state = getState();
            const currentBuildingId = state.Building?.currentBuilding?._id;

            await api.delete(`/api/Building/deleteBloc/${blocId}`);

            // Refresh the current building data to get updated blocs
            if (currentBuildingId) {
                await dispatch(fetchBuildingById(currentBuildingId));
            }

            // Also refresh apartments to ensure deleted bloc's apartments are removed
            if (currentBuildingId) {
                await dispatch(fetchallApartmentsPerBuilding(currentBuildingId));
            } else {
                await dispatch(fetchallApartments());
            }

            return blocId;
        } catch (err) {
            return rejectWithValue(err.response?.data || err.message);
        }
    }
);
export const fetchAllOwnerApartments = createAsyncThunk(
    'building/fetchAllOwnerApartments',
    async (buildingId, { rejectWithValue }) => {
        try {
            const response = await api.get(`/api/Building/my-apartments`);
            return response.data;
        } catch (err) {
            return rejectWithValue(err.response.data);
        }
    }
);

export const updateBloc = createAsyncThunk(
    'building/updateBloc',
    async ({ blocId, blocData }, { rejectWithValue }) => {
        try {
            const response = await api.put(`/api/Building/updateBloc/${blocId}`, blocData);
            return response.data;
        } catch (err) {
            return rejectWithValue(err.response?.data || err.message);
        }
    }
);




export const createCoowner = createAsyncThunk(
    'building/createCoowner',
    async (userData, { rejectWithValue }) => {
        try {
            const response = await api.post('/users/addCoowner', userData);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response.data);
        }
    }
);
export const assignCoOwnerToApartment = createAsyncThunk(
    'building/assignCoOwnerToApartment',
    async ({ apartmentId, coOwnerId }, { rejectWithValue }) => {
        try {
            const response = await api.put(`/api/Building/${apartmentId}/assign-coowner`, {
                coOwnerId
            });
            toast.success('Co-owner assigned successfully');
            return response.data;
        } catch (error) {
            toast.error('Failed to assign co-owner');
            return rejectWithValue(error.response?.data || 'Error assigning co-owner');
        }
    }
);
export const removeCoOwnerFromApartment = createAsyncThunk(
    'building/removeCoOwnerFromApartment',
    async (apartmentId, { rejectWithValue }) => { // Remove the destructuring here
        try {
            const response = await api.put(`/api/Building/apartment/${apartmentId}/coowner-remove-from-apartment`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || 'Error removing co-owner');
        }
    }
);

// Fetch all buildings for the logged-in user
export const fetchBuildings = createAsyncThunk(
    "building/fetchBuildings",
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get("/api/Building");
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || "Failed to fetch buildings");
        }
    }
);

// Fetch building associations for the logged-in user
export const fetchBuildingAssociations = async () => {
  try {
    const response = await api.get('/api/Building/my-associations');
    return response.data;
  } catch (error) {
    console.error('Error fetching building associations:', error);
    throw error;
  }
};
// Ajouter cette fonction pour récupérer les demandes en attente
export const fetchPendingRequests = async () => {
  if (!currentBuilding?._id) return;
  
  try {
    const response = await api.get(`/api/Building/${currentBuilding._id}/associations`);
    // Filter for inactive associations only (pending requests)
    const requests = response.data.filter(assoc => !assoc.isActive);
    setPendingRequests(requests);
  } catch (error) {
    console.error('Error fetching pending access requests:', error);
    toast.error(t('team.errorFetchingRequests'));
  }
};
// Fetch a single building by ID
export const fetchBuildingById = createAsyncThunk(
    "building/fetchBuildingById",
    async (buildingId, { rejectWithValue }) => {
        try {
            const response = await api.get(`/api/Building/${buildingId}`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || "Failed to fetch building");
        }
    }
);

// Create a new building
export const createBuilding = createAsyncThunk(
    "building/createBuilding",
    async (buildingData, { rejectWithValue }) => {
        try {
            const response = await api.post("/api/Building", buildingData);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || "Failed to create building");
        }
    }
);

export const updateBuilding = createAsyncThunk(
    "building/updateBuilding",
    async ({ buildingId, buildingData }, { rejectWithValue }) => {
        try {


            const response = await api.put(`/api/Building/${buildingId}`, buildingData);



            // Make sure we're returning the building object, not just the success message
            // The backend seems to return { message: '...', building: {...} }
            return response.data.building || response.data;
        } catch (error) {
            console.error("Update building error:", error);
            return rejectWithValue(error.response?.data || "Failed to update building");
        }
    }
);

// Delete a building
export const deleteBuilding = createAsyncThunk(
    "building/deleteBuilding",
    async (buildingId, { rejectWithValue }) => {
        try {
            await api.delete(`/api/Building/${buildingId}`);
            return buildingId; // Return the deleted building ID
        } catch (error) {
            return rejectWithValue(error.response?.data || "Failed to delete building");
        }
    }
);

// Co-owner joins a building
export const joinBuilding = createAsyncThunk(
    "building/joinBuilding",
    async (matricule, { rejectWithValue }) => {
        try {
            const response = await api.post("/api/Building/join", { matricule });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || "Failed to join building");
        }
    }
);



//fetch appartement of an owner in a specific building 
export const fetchOwnerAppartements = createAsyncThunk(
    "building/fetchOwnerAppartements",
    async (buildingId, { rejectWithValue }) => {
        try {
            const response = await api.get(`/api/Building/${buildingId}/apartments`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || "Failed to fetch co-owners");
        }
    }
);

// Fetch blocs for a building
export const fetchBuildingBlocs = createAsyncThunk(
    'building/fetchBuildingBlocs',
    async (buildingId, { rejectWithValue }) => {
        try {
            const response = await api.get(`/api/Building/${buildingId}/blocs`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || "Failed to fetch blocs");
        }
    }
);
// Fetch blocs for a building
export const fetchallBlocs = createAsyncThunk(
    'building/fetchallBlocs',
    async (buildingId, { rejectWithValue }) => {
        try {
            const response = await api.get(`/api/Building/blocs`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || "Failed to fetch blocs");
        }
    }
);
// Fetch blocs for a building
export const fetchallApartmentsPerBuilding = createAsyncThunk(
    'building/fetchallApartmentsPerBuilding',
    async (buildingId, { rejectWithValue }) => {
        try {
            const response = await api.get(`/api/Building/${buildingId}/apartments/all`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || "Failed to fetch all aprtments ");
        }
    }
);
// Fetch blocs for a building
export const fetchallApartments = createAsyncThunk(
    'building/fetchallApartments',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get(`/api/Building/apartments`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || "Failed to fetch all aprtments ");
        }
    }
);
// Fetch apartments for a bloc
export const fetchBlocApartments = createAsyncThunk(
    'building/fetchBlocApartments',
    async (blocId, { rejectWithValue }) => {
        try {
            const response = await api.get(`/api/Building/bloc/${blocId}/apartments`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || "Failed to fetch apartments");
        }
    }
);
// Fetch apartments for a bloc
export const fetchmultipleApartmentsPerBlocs = createAsyncThunk(
    'building/fetchmultipleApartmentsPerBlocs',
    async (blocId, { rejectWithValue }) => {
        try {
            const response = await api.get(`/api/Building/blocsAppartments/${blocId}/apartments`);
            console.log("apartments in redux", response.data)
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || "Failed to fetch apartments");
        }
    }
);
// In your buildingSlice.js
export const removeCoownerFromBuilding = createAsyncThunk(
    'building/removeCoowner',
    async ({ buildingId, userId }, { rejectWithValue }) => {
        try {
            const response = await api.patch(`/api/Building/${buildingId}/remove-coowner`, { userId });
            return { buildingId, userId, building: response.data.building };
        } catch (error) {
            return rejectWithValue(error.response?.data || 'Error removing co-owner');
        }
    }
);

export const fetchCoOwners = createAsyncThunk(
    "building/fetchCoOwners",
    async (buildingId, { rejectWithValue }) => {
        try {
            const response = await api.get(`/api/Building/${buildingId}/co-owners`);
            // Ensure we always return an array
            return response.data
        } catch (error) {
            return rejectWithValue(error.response?.data || "Failed to fetch co-owners");
        }
    }
);

export const getAllCoowners = createAsyncThunk(
    "building/getAllCoowners",
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get("/api/Building/AllcoOwners");
            // Ensure we always return an array
            return response.data
        } catch (error) {
            return rejectWithValue(error.response?.data || "Failed to fetch all co-owners");
        }
    }
);


// Add these thunks
export const createApartment = createAsyncThunk(
    'building/createApartment',
    async (apartmentData, { rejectWithValue }) => {
        try {
            const response = await api.post('/api/Building/apartments', apartmentData);
            return response.data;
        } catch (err) {
            return rejectWithValue(err.response.data);
        }
    }
);

export const updateApartment = createAsyncThunk(
    'building/updateApartment',
    async ({ id, apartmentData }, { rejectWithValue }) => {
        try {
            const response = await api.put(`/api/Building/apartments/${id}`, apartmentData);
            return response.data;
        } catch (err) {
            return rejectWithValue(err.response.data);
        }
    }
);

export const deleteApartment = createAsyncThunk(
    'building/deleteApartment',
    async (id, { rejectWithValue }) => {
        try {
            await api.delete(`/api/Building/apartments/${id}`);
            return id;
        } catch (err) {
            return rejectWithValue(err.response.data);
        }
    }
);

// Building transfer actions
export const checkTransferEligibility = createAsyncThunk(
    'building/checkTransferEligibility',
    async ({ buildingId, email }, { rejectWithValue }) => {
        try {
            const response = await api.post(`/api/Building/${buildingId}/check-transfer-eligibility`, { email });
            return response.data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Error checking transfer eligibility');
        }
    }
);

export const transferBuilding = createAsyncThunk(
    'building/transferBuilding',
    async ({ buildingId, targetEmail, confirmEmail }, { rejectWithValue }) => {
        try {
            const response = await api.post(`/api/Building/${buildingId}/transfer`, { 
                targetEmail, 
                confirmEmail 
            });
            return response.data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Error transferring building');
        }
    }
);

export const finalizeBuildingTransfer = createAsyncThunk(
    'building/finalizeBuildingTransfer',
    async ({ buildingId }, { rejectWithValue }) => {
        try {
            const response = await api.post(`/api/Building/${buildingId}/finalize-transfer`);
            return response.data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Error finalizing building transfer');
        }
    }
);

export const cancelBuildingTransfer = createAsyncThunk(
    'building/cancelBuildingTransfer',
    async ({ buildingId }, { rejectWithValue }) => {
        try {
            const response = await api.post(`/api/Building/${buildingId}/cancel-transfer`);
            return response.data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || 'Error cancelling building transfer');
        }
    }
);
// Initial State
const initialState = {
    buildings: [], // Ensure this is an array
    currentBuilding: null, // Currently selected building
    coOwners: [], // List of co-owners for the current building
    blocs: [],
    pagination: {
        total: 0,
        totalPages: 0,
        currentPage: 1,
        hasNextPage: false,
        hasPrevPage: false
    },
    apartments: [], // List of apartments for the current building
    selectedBuilding: null,
    ownerApartments: {
        apartments: [],
        loading: false,
        error: null
    },
    transfer: {
        eligibilityCheck: null,
        loading: false,
        error: null,
        success: false
    },
    loading: false,
    error: null,
    message: null,
};

// Building Slice
const buildingSlice = createSlice({
    name: "building",
    initialState,
    reducers: {
        clearBuildingError: (state) => {
            state.error = null;
        },
        clearBuildingMessage: (state) => {
            state.message = null;
        },
        clearCurrentBuilding: (state) => {
            state.currentBuilding = null; // Clear the current building
        },
        clearSelectedBuilding: (state) => {
            state.selectedBuilding = null
        },
        SetCurrentBuilding: (state, action) => {
            state.currentBuilding = action.payload;
        },
        clearTransferState: (state) => {
            state.transfer = {
                eligibilityCheck: null,
                loading: false,
                error: null,
                success: false
            };
        },
        // ... your other reducers
        resetCoOwners: (state) => {
            state.coOwners = [];
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch Buildings
            .addCase(fetchBuildings.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchBuildings.fulfilled, (state, action) => {
                state.loading = false;
                state.buildings = action.payload;
            })
            .addCase(fetchBuildings.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // Fetch Building by ID
            .addCase(fetchBuildingById.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchBuildingById.fulfilled, (state, action) => {
                state.loading = false;
                state.selectedBuilding = {
                    building: action.payload.building,
                    loading: false,
                    error: null
                };
            })
            .addCase(fetchBuildingById.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // Create Building
            .addCase(createBuilding.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createBuilding.fulfilled, (state, action) => {
                state.loading = false;

                if (Array.isArray(state.buildings)) {
                    state.buildings.push(action.payload); // Add the new building to the array
                } else {
                    state.buildings = [action.payload]; // Reset to an array with the new building
                }
                state.message = "Building created successfully";
            })
            .addCase(createBuilding.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // Update Building
            .addCase(updateBuilding.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
        // In your building.js slice

        // Update this function in your building.js slice file
        builder.addCase(updateBuilding.fulfilled, (state, action) => {
            state.loading = false;
            state.error = null;

            // If we're receiving { message, building } structure
            const updatedBuilding = action.payload.building || action.payload;

            // Update buildings array if it exists
            if (Array.isArray(state.buildings)) {
                // Find and update the building in the array
                const index = state.buildings.findIndex(b => b._id === updatedBuilding._id);
                if (index !== -1) {
                    state.buildings[index] = updatedBuilding;
                }
            } else if (state.buildings && Array.isArray(state.buildings.data)) {
                // Handle nested data structure
                const index = state.buildings.data.findIndex(b => b._id === updatedBuilding._id);
                if (index !== -1) {
                    state.buildings.data[index] = updatedBuilding;
                }
            }

            // Update currentBuilding if it matches
            if (state.currentBuilding && state.currentBuilding._id === updatedBuilding._id) {
                state.currentBuilding = updatedBuilding;
            }

            // Update selectedBuilding if it matches
            if (state.selectedBuilding && state.selectedBuilding.building?._id === updatedBuilding._id) {
                state.selectedBuilding.building = updatedBuilding;
            }
        })
            .addCase(updateBuilding.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // Delete Building
            .addCase(deleteBuilding.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteBuilding.fulfilled, (state, action) => {
                state.loading = false;
                if (Array.isArray(state.buildings)) { // Ensure buildings is an array
                    state.buildings = state.buildings.filter(
                        (building) => building._id !== action.payload
                    );
                } else {
                    console.error("state.buildings is not an array:", state.buildings);
                    state.buildings = []; // Reset to an empty array as a fallback
                }
                state.message = "Building deleted successfully";
            })
            .addCase(deleteBuilding.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // Join Building
            .addCase(joinBuilding.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(joinBuilding.fulfilled, (state, action) => {
                state.loading = false;
                state.message = "Successfully joined the building";
            })
            .addCase(joinBuilding.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // Fetch Co-Owners for a building
            .addCase(fetchCoOwners.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchCoOwners.fulfilled, (state, action) => {
                state.loading = false;
                // Ensure we always set an array
                state.coOwners = action.payload;
            })
            .addCase(fetchCoOwners.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;

            })

            // Get All Co-Owners
            .addCase(getAllCoowners.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getAllCoowners.fulfilled, (state, action) => {
                state.loading = false;
                // Ensure we always set an array
                state.coOwners = action.payload
            })
            .addCase(getAllCoowners.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;

            })

            // Create Co-Owner
            .addCase(createCoowner.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createCoowner.fulfilled, (state, action) => {
                state.loading = false;
                state.message = "Coowner Created Successfully";
            })
            .addCase(createCoowner.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // Fetch Owner Apartments
            .addCase(fetchOwnerAppartements.pending, (state) => {
                state.ownerApartments.loading = true;
                state.ownerApartments.error = null;
            })
            .addCase(fetchOwnerAppartements.fulfilled, (state, action) => {
                state.ownerApartments.loading = false;
                state.ownerApartments.apartments = action.payload.apartments || [];
            })
            .addCase(fetchOwnerAppartements.rejected, (state, action) => {
                state.ownerApartments.loading = false;
                state.ownerApartments.error = action.payload;
            })


            // Fetch Owner Apartments
            .addCase(fetchAllOwnerApartments.pending, (state) => {
                state.ownerApartments.loading = true;
                state.ownerApartments.error = null;
            })
            .addCase(fetchAllOwnerApartments.fulfilled, (state, action) => {
                state.ownerApartments.loading = false;
                state.ownerApartments.apartments = action.payload.apartments || [];
            })
            .addCase(fetchAllOwnerApartments.rejected, (state, action) => {
                state.ownerApartments.loading = false;
                state.ownerApartments.error = action.payload;
            })
            // Fetch building blocs
            .addCase(fetchBuildingBlocs.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchBuildingBlocs.fulfilled, (state, action) => {
                state.loading = false;
                state.blocs = action.payload;
            })
            .addCase(fetchBuildingBlocs.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Fetch all  apartments per building 
            .addCase(fetchallApartments.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchallApartments.fulfilled, (state, action) => {
                state.loading = false;
                state.apartments = action.payload;
            })
            .addCase(fetchallApartments.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Fetch all  apartments per building 
            .addCase(fetchallApartmentsPerBuilding.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchallApartmentsPerBuilding.fulfilled, (state, action) => {
                state.loading = false;
                state.apartments = action.payload;
            })
            .addCase(fetchallApartmentsPerBuilding.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

        // Create apartment
        builder.addCase(createApartment.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(createApartment.fulfilled, (state, action) => {
            state.loading = false;
            state.apartments.push(action.payload);
        });
        builder.addCase(createApartment.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload;
        });

        // Update apartment
        builder.addCase(updateApartment.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(updateApartment.fulfilled, (state, action) => {
            state.loading = false;
            const index = state.apartments.findIndex(a => a._id === action.payload._id);
            if (index !== -1) {
                state.apartments[index] = action.payload;
            }
        });
        builder.addCase(updateApartment.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload;
        });

        // Delete apartment
        builder.addCase(deleteApartment.pending, (state) => {
            state.loading = true;
            state.error = null;
        });
        builder.addCase(deleteApartment.fulfilled, (state, action) => {
            state.loading = false;
            state.apartments = state.apartments.filter(a => a._id !== action.payload);
        });
        builder.addCase(deleteApartment.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload;
        })

            // Fetch bloc apartments
            .addCase(fetchBlocApartments.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchBlocApartments.fulfilled, (state, action) => {
                state.loading = false;
                state.apartments = action.payload;
            })
            .addCase(fetchBlocApartments.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Fetch building blocs
            .addCase(fetchallBlocs.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchallBlocs.fulfilled, (state, action) => {
                state.loading = false;
                state.blocs = action.payload;
            })
            .addCase(fetchallBlocs.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Fetch blocs per apartments
            .addCase(fetchmultipleApartmentsPerBlocs.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchmultipleApartmentsPerBlocs.fulfilled, (state, action) => {
                state.loading = false;
                state.apartments = action.payload;
            })
            .addCase(fetchmultipleApartmentsPerBlocs.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Add these case handlers in the extraReducers section of your buildingSlice

            // Create Bloc
            .addCase(createBloc.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createBloc.fulfilled, (state, action) => {
                state.loading = false;
                // Add the new bloc to the blocs array
                if (Array.isArray(state.blocs)) {
                    state.blocs.push(action.payload);
                } else {
                    state.blocs = [action.payload];
                }
                // Update the building's blocs array if this bloc belongs to the current building
                if (state.currentBuilding && action.payload.building === state.currentBuilding._id) {
                    if (!state.currentBuilding.blocs) {
                        state.currentBuilding.blocs = [];
                    }
                    state.currentBuilding.blocs.push(action.payload);
                }
            })
            .addCase(createBloc.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
        builder.addCase(clearAllBuildingState.fulfilled, (state) => {
            state.buildings = [];
            state.currentBuilding = null;
            state.loading = false;
            state.error = null;
        })
            // Update Bloc
            .addCase(updateBloc.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateBloc.fulfilled, (state, action) => {
                state.loading = false;

                // Update in blocs array
                if (Array.isArray(state.blocs)) {
                    state.blocs = state.blocs.map(bloc =>
                        bloc._id === action.payload._id ? action.payload : bloc
                    );
                }

                // Update in currentBuilding blocs if needed
                if (state.currentBuilding && state.currentBuilding.blocs) {
                    state.currentBuilding.blocs = state.currentBuilding.blocs.map(bloc =>
                        bloc._id === action.payload._id ? action.payload : bloc
                    );
                }
            })
            .addCase(updateBloc.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // Delete Bloc
            .addCase(deleteBloc.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteBloc.fulfilled, (state, action) => {
                state.loading = false;
                const blocId = action.payload;

                // Remove from blocs array
                if (Array.isArray(state.blocs)) {
                    state.blocs = state.blocs.filter(bloc => bloc._id !== blocId);
                }

                // Remove from currentBuilding blocs if needed
                if (state.currentBuilding && state.currentBuilding.blocs) {
                    state.currentBuilding.blocs = state.currentBuilding.blocs.filter(
                        bloc => bloc._id !== blocId
                    );
                }

                // Remove apartments that were in this bloc
                if (Array.isArray(state.apartments)) {
                    state.apartments = state.apartments.filter(apt => apt.bloc !== blocId);
                }

                // Update the selected building as well if needed
                if (state.selectedBuilding && state.selectedBuilding.building &&
                    state.selectedBuilding.building.blocs) {
                    state.selectedBuilding.building.blocs = state.selectedBuilding.building.blocs.filter(
                        bloc => bloc._id !== blocId
                    );
                }
            })
            .addCase(deleteBloc.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // Check Transfer Eligibility
            .addCase(checkTransferEligibility.pending, (state) => {
                state.transfer.loading = true;
                state.transfer.error = null;
                state.transfer.eligibilityCheck = null;
            })
            .addCase(checkTransferEligibility.fulfilled, (state, action) => {
                state.transfer.loading = false;
                state.transfer.eligibilityCheck = action.payload;
                state.transfer.error = null;
            })
            .addCase(checkTransferEligibility.rejected, (state, action) => {
                state.transfer.loading = false;
                state.transfer.error = action.payload;
                state.transfer.eligibilityCheck = null;
            })

            // Transfer Building (Initial Request)
            .addCase(transferBuilding.pending, (state) => {
                state.transfer.loading = true;
                state.transfer.error = null;
                state.transfer.success = false;
            })
            .addCase(transferBuilding.fulfilled, (state, action) => {
                state.transfer.loading = false;
                state.transfer.success = true;
                state.transfer.error = null;
                state.message = action.payload.message;
                // Note: Don't remove building from list yet - that happens on finalize
            })
            .addCase(transferBuilding.rejected, (state, action) => {
                state.transfer.loading = false;
                state.transfer.error = action.payload;
                state.transfer.success = false;
            })

            // Finalize Building Transfer
            .addCase(finalizeBuildingTransfer.pending, (state) => {
                state.transfer.loading = true;
                state.transfer.error = null;
            })
            .addCase(finalizeBuildingTransfer.fulfilled, (state, action) => {
                state.transfer.loading = false;
                state.transfer.success = true;
                state.transfer.error = null;
                state.message = action.payload.message;
                
                // Get the building ID from the payload or from meta
                const buildingId = action.payload.buildingId || action.meta?.arg?.buildingId;
                
                // Now remove building from list since transfer is finalized
                if (Array.isArray(state.buildings) && buildingId) {
                    state.buildings = state.buildings.filter(
                        building => building._id !== buildingId
                    );
                }
                
                // Clear selected building if it was the one transferred
                if (state.selectedBuilding && buildingId &&
                    state.selectedBuilding.building._id === buildingId) {
                    state.selectedBuilding = null;
                }
                
                // Clear current building if it was the one transferred
                if (state.currentBuilding && buildingId &&
                    state.currentBuilding._id === buildingId) {
                    state.currentBuilding = null;
                }
            })
            .addCase(finalizeBuildingTransfer.rejected, (state, action) => {
                state.transfer.loading = false;
                state.transfer.error = action.payload;
            })

            // Cancel Building Transfer
            .addCase(cancelBuildingTransfer.pending, (state) => {
                state.transfer.loading = true;
                state.transfer.error = null;
            })
            .addCase(cancelBuildingTransfer.fulfilled, (state, action) => {
                state.transfer.loading = false;
                state.transfer.success = false;
                state.transfer.error = null;
                state.message = action.payload.message;
                // Reset transfer state
                state.transfer.eligibilityCheck = null;
            })
            .addCase(cancelBuildingTransfer.rejected, (state, action) => {
                state.transfer.loading = false;
                state.transfer.error = action.payload;
            })
    },
});

// Export Actions
export const { 
    resetCoOwners, 
    clearSelectedBuilding, 
    SetCurrentBuilding, 
    clearCurrentBuilding, 
    clearBuildingError, 
    clearBuildingMessage,
    clearTransferState 
} = buildingSlice.actions;

// Export Reducer
export default buildingSlice.reducer;
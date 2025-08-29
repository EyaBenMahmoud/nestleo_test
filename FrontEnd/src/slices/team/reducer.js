import { createSlice } from "@reduxjs/toolkit";
import { getTeamData, addTeamData, updateTeamData, deleteTeamData } from './thunk';
export const initialState = {
    teamData: [],
    error: {},
};

const TeamSlice = createSlice({
    name: 'TeamSlice',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder.addCase(getTeamData.rejected, (state, action) => {
            state.error = action.payload ? action.payload.error : action.error.message;
        });
        builder.addCase(addTeamData.rejected, (state, action) => {
            state.error = action.payload ? action.payload.error : action.error.message;
        });
        builder.addCase(updateTeamData.rejected, (state, action) => {
            state.error = action.payload ? action.payload.error : action.error.message;
        });
        builder.addCase(deleteTeamData.rejected, (state, action) => {
            state.error = action.payload ? action.payload.error : action.error.message;
        });
        
    }
});

export default TeamSlice.reducer;
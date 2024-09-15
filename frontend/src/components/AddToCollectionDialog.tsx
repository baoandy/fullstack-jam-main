import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    SelectChangeEvent,
    CircularProgress,
    Snackbar,
    Alert
} from '@mui/material';
import { ICollection, addCompaniesToCollection } from '../utils/jam-api';

interface AddToCollectionDialogProps {
    open: boolean;
    onClose: () => void;
    selectedCount: number;
    collections: ICollection[];
    selectedCompanyIds: number[];
}

const AddToCollectionDialog: React.FC<AddToCollectionDialogProps> = ({
    open,
    onClose,
    selectedCount,
    collections,
    selectedCompanyIds
}) => {
    const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (event: SelectChangeEvent) => {
        setSelectedCollectionId(event.target.value as string);
    };

    const handleSubmit = async () => {
        if (!selectedCollectionId) return;

        setIsLoading(true);
        setError(null);
        try {
            await addCompaniesToCollection(selectedCompanyIds, selectedCollectionId);
            onClose();
            // Refresh the page, ensuring the same collection is selected TODO
            window.location.reload();
        } catch (error) {
            console.error('Error adding companies to collection:', error);
            setError('Failed to add companies to collection. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCloseError = () => {
        setError(null);
    };

    const selectedCollectionName = selectedCollectionId
        ? collections.find(c => c.id === selectedCollectionId)?.collection_name
        : 'another collection';

    return (
        <>
            <Dialog open={open} onClose={onClose}>
                <DialogTitle>
                    {`Add ${selectedCount} row${selectedCount !== 1 ? 's' : ''} to ${selectedCollectionName}`}
                </DialogTitle>
                <DialogContent>
                    {isLoading ? (
                        <CircularProgress />
                    ) : (
                        <FormControl fullWidth margin="normal">
                            <InputLabel id="collection-select-label">Collection</InputLabel>
                            <Select
                                labelId="collection-select-label"
                                value={selectedCollectionId}
                                onChange={handleChange}
                                label="Collection"
                            >
                                {collections.map((collection) => (
                                    <MenuItem key={collection.id} value={collection.id}>
                                        {collection.collection_name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} disabled={isLoading}>Cancel</Button>
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        color="primary"
                        disabled={isLoading || !selectedCollectionId}
                    >
                        {isLoading ? 'Adding...' : 'Add'}
                    </Button>
                </DialogActions>
            </Dialog>
            <Snackbar open={!!error} autoHideDuration={6000} onClose={handleCloseError}>
                <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
                    {error}
                </Alert>
            </Snackbar>
        </>
    );
};

export default AddToCollectionDialog;
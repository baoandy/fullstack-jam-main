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
    Alert,
    DialogContentText
} from '@mui/material';
import { ICollection, addCollectionToCollection } from '../utils/jam-api';

interface AddAllToCollectionDialogProps {
    open: boolean;
    onClose: () => void;
    collections: ICollection[];
    sourceCollectionId: string;
    sourceCollectionName: string;
}

const AddAllToCollectionDialog: React.FC<AddAllToCollectionDialogProps> = ({
    open,
    onClose,
    collections,
    sourceCollectionId,
    sourceCollectionName,
}) => {
    const [targetCollectionId, setTargetCollectionId] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<'select' | 'confirm'>('select');


    const handleCollectionChange = (event: SelectChangeEvent) => {
        setTargetCollectionId(event.target.value);
    };

    const handleSubmit = () => {
        if (!targetCollectionId) return;
        setStep('confirm'); // Move to confirmation step
    };

    const confirmAndSubmit = async () => {
        setStep('select'); // Reset to initial step
        setIsLoading(true);
        setError(null);
        try {
            // Trigger the add-all-to-collection API call, then reload the page to activate websocket
            await addCollectionToCollection(sourceCollectionId, targetCollectionId);
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

    return (
        <>
            <Dialog open={open} onClose={onClose}>
                <DialogTitle>
                    {step === 'select'
                        ? `Add all companies from ${sourceCollectionName} to ${targetCollectionId
                            ? collections.find(c => c.id === targetCollectionId)?.collection_name
                            : 'another collection'
                        }`
                        : 'Confirm Addition'}
                </DialogTitle>
                <DialogContent>
                    {isLoading ? (
                        <CircularProgress />
                    ) : step === 'select' ? (
                        <FormControl fullWidth margin="normal">
                            <InputLabel id="collection-select-label">Collection</InputLabel>
                            <Select
                                labelId="collection-select-label"
                                value={targetCollectionId}
                                onChange={handleCollectionChange}
                                label="Collection"
                            >
                                {collections.map((collection) => (
                                    <MenuItem key={collection.id} value={collection.id}>
                                        {collection.collection_name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    ) : (
                        <DialogContentText>
                            Are you sure you want to add all companies from {sourceCollectionName} to{' '}
                            {collections.find(c => c.id === targetCollectionId)?.collection_name}?
                            <br />
                            <strong>Note: Since the collection is large, this may take a while.</strong>
                        </DialogContentText>
                    )}
                </DialogContent>
                <DialogActions>
                    {step === 'select' ? (
                        <>
                            <Button onClick={onClose} disabled={isLoading}>Cancel</Button>
                            <Button
                                onClick={handleSubmit}
                                variant="contained"
                                color="primary"
                                disabled={isLoading || !targetCollectionId}
                            >
                                {isLoading ? 'Adding...' : 'Add'}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button onClick={() => setStep('select')} disabled={isLoading}>Back</Button>
                            <Button
                                onClick={confirmAndSubmit}
                                color="primary"
                                variant="contained"
                                disabled={isLoading}
                            >
                                Confirm
                            </Button>
                        </>
                    )}
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

export default AddAllToCollectionDialog;
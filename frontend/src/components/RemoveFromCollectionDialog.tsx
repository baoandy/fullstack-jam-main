import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, Alert, Snackbar } from '@mui/material';
import { removeCompaniesFromCollection } from '../utils/jam-api';

interface RemoveFromCollectionDialogProps {
    open: boolean;
    onClose: () => void;
    selectedCompanyIds: number[];
    selectedCollectionId: string;
}

const RemoveFromCollectionDialog: React.FC<RemoveFromCollectionDialogProps> = ({ open, onClose, selectedCompanyIds, selectedCollectionId }) => {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);

    const handleCloseError = () => {
        setError(null);
    };

    const handleDelete = async () => {
        setLoading(true);
        try {
            await removeCompaniesFromCollection(selectedCompanyIds, selectedCollectionId);
            onClose();
            window.location.reload();
        } catch (error) {
            console.error('Error removing companies from collection:', error);
            setError('Failed to remove companies from collection. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <Dialog open={open} onClose={onClose}>
                <DialogTitle>Remove Rows</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to remove the selected {selectedCompanyIds.length} row(s) from the collection?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button onClick={handleDelete} color="error" variant="contained" disabled={loading}>
                        {loading ? 'Removing...' : 'Remove'}
                    </Button>
                </DialogActions>
            </Dialog>
            <Snackbar open={!!error} autoHideDuration={6000} onClose={handleCloseError}>
                <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
                    {error}
                </Alert>
            </Snackbar>
        </div>
    );
};

export default RemoveFromCollectionDialog;
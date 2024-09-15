import { DataGrid, GridFooter, GridFooterContainer, GridRenderCellParams } from "@mui/x-data-grid";
import { Favorite, FavoriteBorder } from "@mui/icons-material";
import { IconButton, Tooltip, Button, Box, Menu, MenuItem } from "@mui/material";
import { useEffect, useState } from "react";
import { getCollectionsById, ICollection, likeCompany, unlikeCompany } from "../utils/jam-api";
import AddToCollectionDialog from "./AddToCollectionDialog";
import PopupState, { bindMenu, bindTrigger } from "material-ui-popup-state";
import React from "react";
import RemoveFromCollectionDialog from "./RemoveFromCollectionDialog";
import AddAllToCollectionDialog from "./AddAllToCollectionDialog";

const CompanyTable = (props: {
  selectedCollectionId: string;
  allCollections: ICollection[];
}) => {
  const [collection, setCollection] = useState<ICollection>();
  const [total, setTotal] = useState<number>();
  const [offset, setOffset] = useState<number>(0);
  const [pageSize, setPageSize] = useState(25);
  const [selectedCompanies, setSelectedCompanies] = useState<number[]>([]);

  // Collection Actions
  const [addAllDialogOpen, setAddAllDialogOpen] = useState(false);

  // Row Actions
  const [addRowsToCollectionDialogOpen, setAddRowsToCollectionDialogOpen] = useState(false);
  const [removeRowsFromCollectionDialogOpen, setRemoveRowsFromCollectionDialogOpen] = useState(false);


  useEffect(() => {
    getCollectionsById(props.selectedCollectionId, offset, pageSize).then(
      (newResponse) => {
        setTotal(newResponse.total);
        setCollection(newResponse);
      }
    );
  }, [props.selectedCollectionId, offset, pageSize]);

  useEffect(() => {
    setOffset(0);
  }, [props.selectedCollectionId]);

  const handleLikeCompany = async (companyId: number) => {
    const response = await likeCompany(companyId);
    return response.success;
  };

  const handleUnlikeCompany = async (companyId: number) => {
    const response = await unlikeCompany(companyId);
    return response.success;
  };

  const renderLikedCell = (params: GridRenderCellParams) => {
    return (
      <Tooltip title={params.row.liked ? "Unlike company" : "Like company"}>
        <IconButton
          onClick={(event) => {
            event.stopPropagation(); // Prevent the click from propagating to the parent
            // Update the frontend state to keep the row in view until refresh
            if (params.row.liked) {
              handleUnlikeCompany(params.row.id).then((success) => {
                if (success) {
                  params.api.updateRows([{ id: params.row.id, liked: false }]);
                }
              });
            } else {
              handleLikeCompany(params.row.id).then((success) => {
                if (success) {
                  params.api.updateRows([{ id: params.row.id, liked: true }]);
                }
              });
            }
          }}
        >
          {params.row.liked ? <Favorite color="error" fontSize="small" /> : <FavoriteBorder fontSize="small" />}
        </IconButton>
      </Tooltip>
    );
  };

  const CustomFooter = () => {
    return (
      <GridFooterContainer >
        <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2, justifyContent: 'space-between', width: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: '16px' }}>
            <PopupState variant="popover" popupId="collection-actions-menu">
              {(popupState) => (
                <React.Fragment>
                  <Button variant="contained" {...bindTrigger(popupState)}>
                    {collection?.collection_name} Actions
                  </Button>
                  <Menu {...bindMenu(popupState)}>
                    <MenuItem onClick={() => setAddAllDialogOpen(true)}>Add all to other collection</MenuItem>
                  </Menu>
                </React.Fragment>
              )}
            </PopupState>
            {selectedCompanies.length > 0 && (
              <>
                <PopupState variant="popover" popupId="row-actions-menu">
                  {(popupState) => (
                    <React.Fragment>
                      <Button variant="contained" {...bindTrigger(popupState)}>
                        Row Actions
                      </Button>
                      <Menu {...bindMenu(popupState)}>
                        <MenuItem onClick={() => setAddRowsToCollectionDialogOpen(true)}>Add to other collection</MenuItem>
                        <MenuItem onClick={() => setRemoveRowsFromCollectionDialogOpen(true)}>Remove from this collection</MenuItem>
                      </Menu>
                    </React.Fragment>
                  )}
                </PopupState>
                <div>{`${selectedCompanies.length} row(s) selected`}</div>
              </>
            )}
          </Box>
          <GridFooter sx={{ border: 'none' }} />
        </Box>
      </GridFooterContainer>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ height: 800, width: "100%" }}>
        <DataGrid
          rows={collection?.companies}
          rowHeight={30}
          columns={[
            { field: "id", headerName: "ID", width: 90 },
            { field: "company_name", headerName: "Company Name", flex: 1 },
            {
              field: "liked",
              headerName: "Liked",
              width: 110,
              headerAlign: 'center',
              align: 'center',
              renderCell: renderLikedCell,
            }
          ]}
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 25 },
            },
          }}
          rowCount={total}
          pagination
          checkboxSelection
          onRowSelectionModelChange={(newSelectionModel) => {
            setSelectedCompanies(newSelectionModel as number[]);
          }}
          paginationMode="server"
          onPaginationModelChange={(newMeta) => {
            setPageSize(newMeta.pageSize);
            setOffset(newMeta.page * newMeta.pageSize);
          }}
          hideFooterSelectedRowCount  // Using custom footer
          slots={{
            footer: CustomFooter,
          }}
        />
      </div>
      <AddToCollectionDialog
        open={addRowsToCollectionDialogOpen}
        onClose={() => setAddRowsToCollectionDialogOpen(false)}
        selectedCount={selectedCompanies.length}
        collections={props.allCollections.filter(c => c.id !== props.selectedCollectionId)}
        selectedCompanyIds={selectedCompanies}
      />
      <RemoveFromCollectionDialog
        open={removeRowsFromCollectionDialogOpen}
        onClose={() => setRemoveRowsFromCollectionDialogOpen(false)}
        selectedCompanyIds={selectedCompanies}
        selectedCollectionId={props.selectedCollectionId}
      />
      <AddAllToCollectionDialog
        open={addAllDialogOpen}
        onClose={() => setAddAllDialogOpen(false)}
        sourceCollectionId={props.selectedCollectionId}
        sourceCollectionName={collection?.collection_name ?? ''}
        collections={props.allCollections.filter(c => c.id !== props.selectedCollectionId)}
      />
    </div>
  );
};

export default CompanyTable;

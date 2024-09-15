# A quick recap of the changes made by topic

## UX/UI Decisions:

- Refactored the “Liked” column to resemble a spotify-like system, users can like/unlike a company in the row itself
- In the footer of the DataGrid, I added a few buttons on the left side:
    - “Collections” actions: a series of actions that a user can take on the entire list
        - Currently only supports adding this list to another list
        - Note: I thought given the simple UI, this made the most sense. If the UI was more crowded I may have opted for a slightly different placement of this button
    - Row actions (only shows up when at least one row is selected)
        - Adding selected rows to another list
        - Removing selected rows from current list
    - Note that these can be done for any list
- Whenever a longer process is queued up, there will be a snackbar that appears in the bottom right of the screen, following:
    1. User requests to add an entire collection to another collection
    2. API call to backend is made, websocket is created on backend
    3. Frontend refreshes, and hooks up to websocket, listening for updates on progress
    4. When completed, shows a success message, and prompts the user to refresh page
        - If I had more time, I would change the “refresh” to “go to see list” button
- I thought this was particularly important for UX for a few reasons:
    - The user can visually see the progress of their action. With websockets, the user is able to continue using the current page as directed
    - The snackbar shows no matter what, the user can leave the page and come back at any point without affecting this
    - What I would do next: currently only support one bulk action. In reality there are probably more than 2 lists, and the user should be able to queue more than one action at a time

## Backend:

- **Redis**:
    - in-memory data store, chosen for its speed and efficiency in handling real-time data
    - for fast tracking the progress of background tasks
    - redis pubsub also syncs well with the websockets
    - Hooked up to a new docker container, no additional instructions were needed in the README
- **FastAPI Background Tasks**:
    - Handle asynchronous requests without affecting the main application thread
    - Works well for local environment for a simple operation like DB writing and was quick to set up in comparison to more heavyweight tools
    - If this were more complex operations, then I would likely go for a more heavyweight tool, as this could potentially slow down the server if the background tasks become too complex
        - in production, there would  be ways to configure workers/machines too, which would also come into play
- **WebSockets**:
    - Was choosing between a simple polling vs websockets. Ultimately chose this as we already had redis set up
    - Removes need for polling by frontend, is effective at showing updates
- Other smaller decisions
    - exposed a “task_in_progress” endpoint so the frontend can check if there is currently a batch task going on. In practice/on production, would have a more advanced way of tracking the tasks in progress linked to user auth
    - Pass the entire message of what “loading” should look like to the frontend, e.g. “Adding My List to Liked Companies”. I chose to do this so that future batch actions can use the existing redis framework
- Ultimately, some of the setup could be tidied up to be better reused, but works fine for this change.

## Next Steps I would do to continue developing/maintain this feature:

- Basic dashboard features
    - Add searching of companies (with autocomplete)
    - Filtering and sorting
- A way to undo/cancel a batch process
- Right click menu bar to show list actions (or even just a triple dot button)
- Importing/exporting lists
- Collaboration - sharing lists with teammates, crafting/sending a slack message right from in the app, open up discussion threads/notes on each company inside the system
- Can do a lot more with more columns/data!

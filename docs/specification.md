# System Requirements

_Last updated: 2026-02-10_

## Sync

- client updates sent to the server are stored in individual rows in the document_updates table
- connecting to an existing document synchronises all updates to the client
- changes by one user synchronise to other users
- simultaneous changes by multiple users get synced on the server and all clients receive the same result
- updates should include deleting, modifying and adding content to a document
- readonly clients can receive updates but cannot send updates
- every update is stored in the database with the id of the user who sent it
- if a document is public, authentication is not required, but the document should be readonly
- to write to a document, the user must be the owner or granted access via DocumentUser.canWrite
- non public documents require an entry in the DocumentUsers table to read

## Documents

- Documents are generic and can be used for storing different types of data
- The type field defines the type of document
- Documents can be private or public
- The document name, type, isPublic and meta are stored in the Document table
- Documents are Yjs based
- Each yjs update is stored in a documentUpdate table
- The user who submitted the update is stored in the update table
- Each yjs document should have a "meta" property with a YMap of values
- On each new yjs update received, if a meta values has changed, the meta values should be serialised to json and stored in the Database.meta field
- Documents can only be created by authenticated users
- Public documents are readonly for all site visitors
- Users can be assigned access to a document via the DocumentUser table
- Only the document creator or users with DocumentUser.canWrite can update documents
- Documents can link to a base document
  - updates from base documents are not duplicated to the document's own DocumentUpdate rows
  - when loading a document that has a base document, both sets of updates should be loaded
  - whilst the document is open changes to the document or the base document should live sync
  - base documents can go down many levels, ie a base document can have a base document, cyclic base documents are not allowed

## Document Types

### Presentation

- has the document type "presentation"
- has meta.title
- has meta.themeId (documentId)
- stores presentation content as rich text
- can also override all values from theme

### Theme

- has the document type "theme"
- has meta.font
- has meta.backgroundColor
- has meta.textColor
- has meta.isSystemTheme
- has a background image
- defines viewport area
  - presentation content is constrained to appear within the viewport area
- system themes are readonly
- non system themes can be based on a system theme

### Event

- has the document type "event"
- has a list of presentations (documentIds)
- has a list of channels
- presentations can be assigned to channels
- for each channel presentation relation the theme can be overridden, this allows the same presentation to have a different theme for each channel
- presentations can be ordered
- channels can be ordered

## Web App

### Accounts

- users can sign up with first name, last name, email and password
- user emails are verified, by sending an email to the user, before they are added to the user table
- users can reset their passwords via a "forgot password" form which will send them an email with a link to a password reset form
- users can delete their account. they will be asked to confirm before all data is deleted

### Presentations

- Each registered user can view a list of presentations and create new ones
- Users can be added to a presentation via the DocumentUser table
- The presentation list includes the current user's presentations as well as those they are assigned to via the DocumentUser table
- The presentation list is ordered by lastUpdated date descending
- Presentations can be opened for editing when the user is the owner or has DocumentUser.canWrite
- Presentations can be opened for presenting when the user is the owner or has DocumentUser.canWrite
- Presentations can be viewed via /presentation/[documentId]
- access to the presentation is managed by the event Document.isPublic
- authentication is required for private presentations, and the user must be the presentation owner or in the DocumentUser list
- users do not need to authenticate for public presentations

#### Presentation Editor

- can be accessed via /presentation/[documentId]/edit
- allows the presentation title and theme to be edited
- the presentation content can be edited as richtext

#### Rich Text Editor component

- has the following content types
  - paragraph
  - h1, h2, h3
  - bold
  - italic
  - underline
  - strikethrough
  - ordered and unordered lists
  - images (stored inline)
  - slide divider (behaves like a page break, but forces a new presentation slide to start)
  - quote (including an attribution line)
  - collaborative editing, realtime cursor positions with usernames

#### Presentation Viewer

- can be accessed via /presentation/[documentId]
- views the presentation using a "viewer" component

#### Presentation presenter

- can be accessed via /presentation/[documentId]/presenter
- uses the same "viewer" component, but with a theme override
- rich text should automatically be segmented into presentation points
- segmenting logic:
  - each line is a segment
  - each bullet point is a segment
  - each paragraph or heading is a segment
  - a picture is a segment
  - longer text based segments should be split into sentence segments
- has controls to let the user move forwards or backwards in the presentation points
- lets the user tap/click on a presentation point to jump to it
- lets the user scroll to find points to jump to

### Events

- lets users organise several presentations for a single event
- lets users organise several channels for an event
- presentations can be added or removed from the event
- presentations can be ordered
- channels can be created for the event
- presentations can be mapped to a channel
- presentations mapped to a channel are shown to viewers of the channel
- themes for presentations in a channel can be overridden for the presentation/channel relation

### Channels

- A channel is registered in the Channel table
- channels can be access by /channel/[slug]
- a channel points to an event document where the channel is stored by name
- access to the channel is managed by the event Document.isPublic
- authentication is required for private channels, and the user must be the channel owner or in the DocumentUser list
- users do not need to authenticate for public events
- when viewing a channel, the presentation currently selected in the event will be displayed via the presentation viewer

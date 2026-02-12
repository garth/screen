defmodule ScreenWeb.UserChannel do
  @moduledoc """
  Handles `user:{userId}` channel for authenticated user operations.

  ## Join

  - `user:{userId}` — returns user profile and theme list

  ## Incoming Events

  - `create_document` — creates a new document (presentation/theme/event)
  - `delete_document` — soft-deletes a document owned by the user
  - `update_document` — updates document attrs (name, isPublic, meta)
  - `create_channel` — creates a channel for an event (requires write access)
  - `delete_channel` — deletes a channel owned by the user
  - `update_profile` — updates user first/last name
  - `change_password` — changes user password (requires current password)
  - `delete_account` — permanently deletes the user account

  ## Outgoing Events

  - `user_updated` — pushed after profile update with new user data
  """

  use ScreenWeb, :channel

  alias Screen.Accounts
  alias Screen.Channels
  alias Screen.Documents

  @impl true
  def join("user:" <> user_id, _params, socket) do
    user = socket.assigns.user

    if user && user.id == user_id do
      reply = %{
        user: %{
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email
        },
        themes: Documents.list_user_themes(user.id),
        documents: format_documents(Documents.list_user_documents(user.id))
      }

      {:ok, reply, socket}
    else
      {:error, %{reason: "unauthorized"}}
    end
  end

  @impl true
  def handle_in("create_document", %{"type" => type}, socket) do
    case Documents.create_document(socket.assigns.user.id, type) do
      {:ok, document} ->
        push_documents(socket)
        {:reply, {:ok, %{id: document.id}}, socket}

      {:error, :invalid_type} ->
        {:reply, {:error, %{reason: "invalid document type"}}, socket}

      {:error, _changeset} ->
        {:reply, {:error, %{reason: "failed to create document"}}, socket}
    end
  end

  @impl true
  def handle_in("delete_document", %{"id" => doc_id}, socket) do
    case Documents.delete_document(doc_id, socket.assigns.user.id) do
      {:ok, _document} ->
        push_documents(socket)
        {:reply, :ok, socket}

      {:error, :not_found} ->
        {:reply, {:error, %{reason: "not found"}}, socket}

      {:error, :unauthorized} ->
        {:reply, {:error, %{reason: "unauthorized"}}, socket}
    end
  end

  @impl true
  def handle_in("update_profile", %{"firstName" => first_name, "lastName" => last_name}, socket) do
    case Accounts.update_user_profile(socket.assigns.user, %{
           first_name: first_name,
           last_name: last_name
         }) do
      {:ok, updated_user} ->
        push(socket, "user_updated", %{
          user: %{
            id: updated_user.id,
            firstName: updated_user.first_name,
            lastName: updated_user.last_name,
            email: updated_user.email
          }
        })

        {:reply, :ok, assign(socket, :user, updated_user)}

      {:error, _changeset} ->
        {:reply, {:error, %{reason: "failed to update profile"}}, socket}
    end
  end

  @impl true
  def handle_in(
        "change_password",
        %{"currentPassword" => current_password, "newPassword" => new_password},
        socket
      ) do
    user = socket.assigns.user

    case Accounts.get_user_by_email_and_password(user.email, current_password) do
      nil ->
        {:reply, {:error, %{reason: "current password is incorrect"}}, socket}

      _user ->
        case Accounts.update_user_password(user, %{password: new_password}) do
          {:ok, {_user, _tokens}} ->
            {:reply, :ok, socket}

          {:error, _changeset} ->
            {:reply, {:error, %{reason: "failed to change password"}}, socket}
        end
    end
  end

  @impl true
  def handle_in("delete_account", _params, socket) do
    case Accounts.delete_user(socket.assigns.user) do
      {:ok, _user} ->
        {:reply, :ok, socket}

      {:error, _reason} ->
        {:reply, {:error, %{reason: "failed to delete account"}}, socket}
    end
  end

  @impl true
  def handle_in(
        "create_channel",
        %{"name" => name, "slug" => slug, "eventDocumentId" => event_doc_id},
        socket
      ) do
    user_id = socket.assigns.user.id

    case Documents.check_document_permission(event_doc_id, user_id) do
      {:ok, :read_write} ->
        case Channels.create_channel(user_id, event_doc_id, %{name: name, slug: slug}) do
          {:ok, channel} ->
            {:reply, {:ok, %{id: channel.id}}, socket}

          {:error, _changeset} ->
            {:reply, {:error, %{reason: "failed to create channel"}}, socket}
        end

      _ ->
        {:reply, {:error, %{reason: "unauthorized"}}, socket}
    end
  end

  @impl true
  def handle_in("delete_channel", %{"id" => channel_id}, socket) do
    case Channels.get_channel(channel_id) do
      nil ->
        {:reply, {:error, %{reason: "not found"}}, socket}

      channel ->
        if channel.user_id == socket.assigns.user.id do
          {:ok, _} = Channels.delete_channel(channel)
          {:reply, :ok, socket}
        else
          {:reply, {:error, %{reason: "unauthorized"}}, socket}
        end
    end
  end

  @impl true
  def handle_in(
        "update_document",
        %{"id" => id} = params,
        socket
      ) do
    attrs =
      params
      |> Map.take(["name", "isPublic", "meta"])
      |> Enum.reduce(%{}, fn
        {"name", v}, acc -> Map.put(acc, :name, v)
        {"isPublic", v}, acc -> Map.put(acc, :is_public, v)
        {"meta", v}, acc -> Map.put(acc, :meta, v)
        _, acc -> acc
      end)

    case Documents.update_document(id, socket.assigns.user.id, attrs) do
      {:ok, _document} ->
        push_documents(socket)
        {:reply, :ok, socket}

      {:error, :not_found} ->
        {:reply, {:error, %{reason: "not found"}}, socket}

      {:error, :unauthorized} ->
        {:reply, {:error, %{reason: "unauthorized"}}, socket}

      {:error, _changeset} ->
        {:reply, {:error, %{reason: "failed to update document"}}, socket}
    end
  end

  # --- Private Helpers ---

  defp push_documents(socket) do
    documents = Documents.list_user_documents(socket.assigns.user.id)
    push(socket, "documents_updated", %{documents: format_documents(documents)})
  end

  defp format_documents(documents) do
    Enum.map(documents, fn doc ->
      %{
        id: doc.id,
        title: doc.name,
        type: doc.type,
        isPublic: doc.is_public,
        isOwner: doc.is_owner,
        canWrite: doc.can_write,
        updatedAt: doc.updated_at
      }
    end)
  end
end

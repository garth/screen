if Application.compile_env(:screen, :dev_routes) do
  defmodule ScreenWeb.TestController do
    use ScreenWeb, :controller

    alias Screen.Accounts
    alias Screen.Documents
    alias Screen.Documents.{Document, DocumentUser}
    alias Screen.Repo

    def create_user(conn, params) do
      attrs = %{
        email: params["email"],
        first_name: params["firstName"],
        last_name: params["lastName"]
      }

      {:ok, user} = Accounts.register_user(attrs)

      # Confirm the user and set password
      user =
        user
        |> Accounts.User.confirm_changeset()
        |> Repo.update!()

      user =
        if params["password"] do
          {:ok, {user, _}} = Accounts.update_user_password(user, %{password: params["password"]})
          user
        else
          user
        end

      json(conn, %{id: user.id, email: user.email})
    end

    def create_unverified_user(conn, params) do
      attrs = %{
        email: params["email"],
        first_name: params["firstName"],
        last_name: params["lastName"]
      }

      {:ok, user} = Accounts.register_user(attrs)

      user =
        if params["password"] do
          {:ok, {user, _}} = Accounts.update_user_password(user, %{password: params["password"]})
          user
        else
          user
        end

      # Generate a verification (login) token
      {encoded_token, user_token} = Accounts.UserToken.build_email_token(user, "login")
      Repo.insert!(user_token)

      json(conn, %{
        id: user.id,
        email: user.email,
        verificationToken: encoded_token
      })
    end

    def create_password_reset(conn, params) do
      user = Accounts.get_user_by_email(params["email"])

      {encoded_token, user_token} = Accounts.UserToken.build_email_token(user, "login")
      Repo.insert!(user_token)

      json(conn, %{
        email: user.email,
        resetToken: encoded_token
      })
    end

    def create_document(conn, params) do
      attrs = %{
        name: params["name"] || "Untitled",
        is_public: params["public"] || false,
        meta: params["meta"] || %{},
        base_document_id: params["baseDocumentId"]
      }

      {:ok, document} = Documents.create_document(params["userId"], params["type"], attrs)

      json(conn, %{
        id: document.id,
        name: document.name,
        type: document.type,
        public: document.is_public,
        baseDocumentId: document.base_document_id
      })
    end

    def update_document(conn, params) do
      document = Documents.get_document!(params["id"])

      attrs =
        %{}
        |> then(fn a ->
          if Map.has_key?(params, "baseDocumentId"),
            do: Map.put(a, :base_document_id, params["baseDocumentId"]),
            else: a
        end)

      document =
        document
        |> Document.changeset(attrs)
        |> Repo.update!()

      json(conn, %{
        id: document.id,
        baseDocumentId: document.base_document_id
      })
    end

    def document_meta(conn, %{"id" => id}) do
      document = Documents.get_document!(id)
      json(conn, document.meta || %{})
    end

    def create_document_user(conn, params) do
      attrs = %{can_write: params["write"] || false}

      du =
        %DocumentUser{}
        |> DocumentUser.changeset(attrs)
        |> Ecto.Changeset.put_change(:document_id, params["documentId"])
        |> Ecto.Changeset.put_change(:user_id, params["userId"])
        |> Repo.insert!()

      json(conn, %{
        id: du.id,
        documentId: du.document_id,
        userId: du.user_id,
        write: du.can_write
      })
    end
  end
end

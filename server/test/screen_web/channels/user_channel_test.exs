defmodule ScreenWeb.UserChannelTest do
  use ScreenWeb.ChannelCase, async: true

  alias ScreenWeb.{UserSocket, UserChannel}

  import Screen.AccountsFixtures
  import Screen.DocumentsFixtures

  setup do
    user = user_fixture()
    token = Screen.Accounts.generate_user_session_token(user)
    {:ok, socket} = connect(UserSocket, %{"token" => token})

    %{user: user, socket: socket, token: token}
  end

  describe "join/3" do
    test "authenticated user can join their own channel", %{user: user, socket: socket} do
      assert {:ok, reply, _socket} =
               subscribe_and_join(socket, UserChannel, "user:#{user.id}")

      assert reply.user.id == user.id
      assert reply.user.firstName == user.first_name
      assert reply.user.lastName == user.last_name
      assert reply.user.email == user.email
      assert is_list(reply.themes)
    end

    test "authenticated user cannot join another user's channel", %{socket: socket} do
      other_user = user_fixture()

      assert {:error, %{reason: "unauthorized"}} =
               subscribe_and_join(socket, UserChannel, "user:#{other_user.id}")
    end

    test "unauthenticated socket cannot join", %{user: user} do
      {:ok, socket} = connect(UserSocket, %{})

      assert {:error, %{reason: "unauthorized"}} =
               subscribe_and_join(socket, UserChannel, "user:#{user.id}")
    end

    test "join reply includes user themes", %{user: user, socket: socket} do
      _theme = document_fixture(user, %{name: "My Theme", type: "theme"})

      {:ok, reply, _socket} =
        subscribe_and_join(socket, UserChannel, "user:#{user.id}")

      assert length(reply.themes) == 1
      assert hd(reply.themes).name == "My Theme"
    end
  end

  describe "create_document" do
    setup %{user: user, socket: socket} do
      {:ok, _reply, socket} =
        subscribe_and_join(socket, UserChannel, "user:#{user.id}")

      %{channel_socket: socket}
    end

    test "creates a presentation", %{channel_socket: socket} do
      ref = push(socket, "create_document", %{"type" => "presentation"})
      assert_reply ref, :ok, %{id: id}
      assert is_binary(id)

      doc = Screen.Documents.get_document!(id)
      assert doc.type == "presentation"
      assert doc.name == "Untitled"
    end

    test "creates a theme", %{channel_socket: socket} do
      ref = push(socket, "create_document", %{"type" => "theme"})
      assert_reply ref, :ok, %{id: id}

      doc = Screen.Documents.get_document!(id)
      assert doc.type == "theme"
    end

    test "creates an event", %{channel_socket: socket} do
      ref = push(socket, "create_document", %{"type" => "event"})
      assert_reply ref, :ok, %{id: id}

      doc = Screen.Documents.get_document!(id)
      assert doc.type == "event"
    end

    test "rejects invalid type", %{channel_socket: socket} do
      ref = push(socket, "create_document", %{"type" => "invalid"})
      assert_reply ref, :error, %{reason: "invalid document type"}
    end
  end

  describe "delete_document" do
    setup %{user: user, socket: socket} do
      {:ok, _reply, socket} =
        subscribe_and_join(socket, UserChannel, "user:#{user.id}")

      %{channel_socket: socket}
    end

    test "deletes own document", %{user: user, channel_socket: socket} do
      doc = document_fixture(user)
      ref = push(socket, "delete_document", %{"id" => doc.id})
      assert_reply ref, :ok

      deleted = Screen.Documents.get_document!(doc.id)
      assert deleted.deleted_at != nil
    end

    test "cannot delete another user's document", %{channel_socket: socket} do
      other_user = user_fixture()
      doc = document_fixture(other_user)

      ref = push(socket, "delete_document", %{"id" => doc.id})
      assert_reply ref, :error, %{reason: "unauthorized"}
    end

    test "returns error for nonexistent document", %{channel_socket: socket} do
      ref = push(socket, "delete_document", %{"id" => ExCuid2.generate()})
      assert_reply ref, :error, %{reason: "not found"}
    end
  end

  describe "update_profile" do
    setup %{user: user, socket: socket} do
      {:ok, _reply, socket} =
        subscribe_and_join(socket, UserChannel, "user:#{user.id}")

      %{channel_socket: socket}
    end

    test "updates first and last name", %{channel_socket: socket} do
      ref = push(socket, "update_profile", %{"firstName" => "Jane", "lastName" => "Doe"})
      assert_reply ref, :ok

      assert_push "user_updated", %{user: updated_user}
      assert updated_user.firstName == "Jane"
      assert updated_user.lastName == "Doe"
    end

    test "rejects empty names", %{channel_socket: socket} do
      ref = push(socket, "update_profile", %{"firstName" => "", "lastName" => "Doe"})
      assert_reply ref, :error, %{reason: "failed to update profile"}
    end
  end

  describe "change_password" do
    setup %{user: user, socket: _socket} do
      # Set a password on the user so we can test changing it
      user = set_password(user)

      # Need to reconnect since tokens were expired
      token = Screen.Accounts.generate_user_session_token(user)
      {:ok, socket} = connect(UserSocket, %{"token" => token})

      {:ok, _reply, socket} =
        subscribe_and_join(socket, UserChannel, "user:#{user.id}")

      %{user: user, channel_socket: socket}
    end

    test "changes password with correct current password", %{channel_socket: socket} do
      ref =
        push(socket, "change_password", %{
          "currentPassword" => valid_user_password(),
          "newPassword" => "new valid password123"
        })

      assert_reply ref, :ok
    end

    test "rejects incorrect current password", %{channel_socket: socket} do
      ref =
        push(socket, "change_password", %{
          "currentPassword" => "wrong password!!",
          "newPassword" => "new valid password123"
        })

      assert_reply ref, :error, %{reason: "current password is incorrect"}
    end
  end

  describe "delete_account" do
    setup %{user: user, socket: socket} do
      {:ok, _reply, socket} =
        subscribe_and_join(socket, UserChannel, "user:#{user.id}")

      %{channel_socket: socket}
    end

    test "soft-deletes the user", %{user: user, channel_socket: socket} do
      ref = push(socket, "delete_account", %{})
      assert_reply ref, :ok

      deleted = Screen.Accounts.get_user!(user.id)
      assert deleted.deleted_at != nil
    end
  end
end

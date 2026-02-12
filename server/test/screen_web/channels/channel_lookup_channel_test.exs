defmodule ScreenWeb.ChannelLookupChannelTest do
  use ScreenWeb.ChannelCase, async: true

  alias ScreenWeb.{UserSocket, ChannelLookupChannel}

  import Screen.AccountsFixtures
  import Screen.DocumentsFixtures

  setup do
    owner = user_fixture()
    event = document_fixture(owner, %{type: "event", is_public: true})

    {:ok, channel} =
      Screen.Channels.create_channel(owner.id, event.id, %{
        name: "Main Stage",
        slug: "main-stage"
      })

    %{owner: owner, event: event, channel: channel}
  end

  describe "join/3 — public event" do
    test "anonymous user can join public channel", %{channel: channel} do
      {:ok, socket} = connect(UserSocket, %{}, connect_info: %{session: %{}})

      assert {:ok, reply, _socket} =
               subscribe_and_join(socket, ChannelLookupChannel, "channel:slug:main-stage")

      assert reply.id == channel.id
      assert reply.name == "Main Stage"
      assert reply.slug == "main-stage"
      assert reply.eventDocumentId == channel.event_document_id
    end

    test "authenticated user can join public channel", %{channel: channel} do
      user = user_fixture()
      token = Screen.Accounts.generate_user_session_token(user)

      {:ok, socket} =
        connect(UserSocket, %{}, connect_info: %{session: %{"user_token" => token}})

      assert {:ok, reply, _socket} =
               subscribe_and_join(socket, ChannelLookupChannel, "channel:slug:main-stage")

      assert reply.id == channel.id
    end
  end

  describe "join/3 — private event" do
    setup %{owner: owner} do
      private_event = document_fixture(owner, %{type: "event", is_public: false})

      {:ok, private_channel} =
        Screen.Channels.create_channel(owner.id, private_event.id, %{
          name: "Private Stage",
          slug: "private-stage"
        })

      %{private_event: private_event, private_channel: private_channel}
    end

    test "anonymous user cannot join private channel" do
      {:ok, socket} = connect(UserSocket, %{}, connect_info: %{session: %{}})

      assert {:error, %{reason: "not found"}} =
               subscribe_and_join(socket, ChannelLookupChannel, "channel:slug:private-stage")
    end

    test "unrelated user cannot join private channel" do
      other_user = user_fixture()
      token = Screen.Accounts.generate_user_session_token(other_user)

      {:ok, socket} =
        connect(UserSocket, %{}, connect_info: %{session: %{"user_token" => token}})

      assert {:error, %{reason: "not found"}} =
               subscribe_and_join(socket, ChannelLookupChannel, "channel:slug:private-stage")
    end

    test "event owner can join private channel", %{owner: owner, private_channel: private_channel} do
      token = Screen.Accounts.generate_user_session_token(owner)

      {:ok, socket} =
        connect(UserSocket, %{}, connect_info: %{session: %{"user_token" => token}})

      assert {:ok, reply, _socket} =
               subscribe_and_join(socket, ChannelLookupChannel, "channel:slug:private-stage")

      assert reply.id == private_channel.id
    end

    test "shared user can join private channel", %{private_event: private_event} do
      shared_user = user_fixture()
      document_user_fixture(private_event, shared_user, %{can_write: false})
      token = Screen.Accounts.generate_user_session_token(shared_user)

      {:ok, socket} =
        connect(UserSocket, %{}, connect_info: %{session: %{"user_token" => token}})

      assert {:ok, _reply, _socket} =
               subscribe_and_join(socket, ChannelLookupChannel, "channel:slug:private-stage")
    end
  end

  describe "join/3 — error cases" do
    test "returns error for nonexistent slug" do
      {:ok, socket} = connect(UserSocket, %{}, connect_info: %{session: %{}})

      assert {:error, %{reason: "not found"}} =
               subscribe_and_join(socket, ChannelLookupChannel, "channel:slug:nonexistent")
    end

    test "returns error for soft-deleted channel", %{owner: owner, channel: channel} do
      {:ok, _} = Screen.Channels.delete_channel(channel)

      token = Screen.Accounts.generate_user_session_token(owner)

      {:ok, socket} =
        connect(UserSocket, %{}, connect_info: %{session: %{"user_token" => token}})

      assert {:error, %{reason: "not found"}} =
               subscribe_and_join(socket, ChannelLookupChannel, "channel:slug:main-stage")
    end
  end
end

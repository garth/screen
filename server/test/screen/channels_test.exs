defmodule Screen.ChannelsTest do
  use Screen.DataCase, async: true

  alias Screen.Channels

  import Screen.AccountsFixtures
  import Screen.DocumentsFixtures

  setup do
    user = user_fixture()
    event = document_fixture(user, %{name: "Test Event", type: "event"})
    %{user: user, event: event}
  end

  describe "create_channel/3" do
    test "creates a channel with valid attrs", %{user: user, event: event} do
      assert {:ok, channel} =
               Channels.create_channel(user.id, event.id, %{
                 name: "Main Stage",
                 slug: "main-stage"
               })

      assert channel.name == "Main Stage"
      assert channel.slug == "main-stage"
      assert channel.user_id == user.id
      assert channel.event_document_id == event.id
    end

    test "rejects duplicate slug", %{user: user, event: event} do
      {:ok, _} = Channels.create_channel(user.id, event.id, %{name: "Ch1", slug: "same-slug"})

      assert {:error, changeset} =
               Channels.create_channel(user.id, event.id, %{name: "Ch2", slug: "same-slug"})

      assert %{slug: ["has already been taken"]} = errors_on(changeset)
    end

    test "requires name", %{user: user, event: event} do
      assert {:error, changeset} =
               Channels.create_channel(user.id, event.id, %{slug: "no-name"})

      assert %{name: ["can't be blank"]} = errors_on(changeset)
    end
  end

  describe "get_channel_by_slug/1" do
    test "returns channel by slug", %{user: user, event: event} do
      {:ok, channel} =
        Channels.create_channel(user.id, event.id, %{name: "Test", slug: "test-slug"})

      found = Channels.get_channel_by_slug("test-slug")
      assert found.id == channel.id
    end

    test "returns nil for nonexistent slug" do
      assert Channels.get_channel_by_slug("nonexistent") == nil
    end

    test "excludes soft-deleted channels", %{user: user, event: event} do
      {:ok, channel} =
        Channels.create_channel(user.id, event.id, %{name: "Deleted", slug: "deleted-slug"})

      {:ok, _} = Channels.delete_channel(channel)
      assert Channels.get_channel_by_slug("deleted-slug") == nil
    end
  end

  describe "list_channels_for_event/1" do
    test "returns channels for event", %{user: user, event: event} do
      {:ok, _} = Channels.create_channel(user.id, event.id, %{name: "Ch1", slug: "ch1"})
      {:ok, _} = Channels.create_channel(user.id, event.id, %{name: "Ch2", slug: "ch2"})

      channels = Channels.list_channels_for_event(event.id)
      assert length(channels) == 2
    end

    test "excludes soft-deleted channels", %{user: user, event: event} do
      {:ok, channel} = Channels.create_channel(user.id, event.id, %{name: "Del", slug: "del"})
      {:ok, _} = Channels.delete_channel(channel)

      assert Channels.list_channels_for_event(event.id) == []
    end

    test "returns empty list for event with no channels", %{event: event} do
      assert Channels.list_channels_for_event(event.id) == []
    end
  end

  describe "update_channel/2" do
    test "updates name and slug", %{user: user, event: event} do
      {:ok, channel} =
        Channels.create_channel(user.id, event.id, %{name: "Old", slug: "old-slug"})

      assert {:ok, updated} =
               Channels.update_channel(channel, %{name: "New", slug: "new-slug"})

      assert updated.name == "New"
      assert updated.slug == "new-slug"
    end
  end

  describe "delete_channel/1" do
    test "soft-deletes a channel", %{user: user, event: event} do
      {:ok, channel} =
        Channels.create_channel(user.id, event.id, %{name: "ToDelete", slug: "to-delete"})

      assert {:ok, deleted} = Channels.delete_channel(channel)
      assert deleted.deleted_at != nil
    end
  end

  describe "get_channel_by_slug_with_event/1" do
    test "returns channel with preloaded event document", %{user: user, event: event} do
      {:ok, channel} =
        Channels.create_channel(user.id, event.id, %{name: "Test", slug: "with-event"})

      found = Channels.get_channel_by_slug_with_event("with-event")
      assert found.id == channel.id
      assert found.event_document.id == event.id
    end

    test "returns nil for nonexistent slug" do
      assert Channels.get_channel_by_slug_with_event("nonexistent") == nil
    end

    test "excludes soft-deleted channels", %{user: user, event: event} do
      {:ok, channel} =
        Channels.create_channel(user.id, event.id, %{name: "Del", slug: "del-event"})

      {:ok, _} = Channels.delete_channel(channel)
      assert Channels.get_channel_by_slug_with_event("del-event") == nil
    end
  end

  describe "get_channel/1" do
    test "returns channel by id", %{user: user, event: event} do
      {:ok, channel} =
        Channels.create_channel(user.id, event.id, %{name: "Test", slug: "test-get"})

      assert Channels.get_channel(channel.id).id == channel.id
    end

    test "returns nil for soft-deleted channel", %{user: user, event: event} do
      {:ok, channel} =
        Channels.create_channel(user.id, event.id, %{name: "Del", slug: "del-get"})

      {:ok, _} = Channels.delete_channel(channel)
      assert Channels.get_channel(channel.id) == nil
    end

    test "returns nil for nonexistent id" do
      assert Channels.get_channel(ExCuid2.generate()) == nil
    end
  end
end

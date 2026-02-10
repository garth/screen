defmodule Screen.DocumentsTest do
  use Screen.DataCase, async: true

  alias Screen.Documents

  import Screen.AccountsFixtures
  import Screen.DocumentsFixtures

  setup do
    user = user_fixture()
    %{user: user}
  end

  describe "get_document!/1" do
    test "returns the document with the given id", %{user: user} do
      document = document_fixture(user)
      assert Documents.get_document!(document.id).id == document.id
    end

    test "raises when document does not exist" do
      fake_id = ExCuid2.generate()

      assert_raise Ecto.NoResultsError, fn ->
        Documents.get_document!(fake_id)
      end
    end
  end

  describe "get_document/1" do
    test "returns the document with the given id", %{user: user} do
      document = document_fixture(user)
      assert Documents.get_document(document.id).id == document.id
    end

    test "returns nil when document does not exist" do
      fake_id = ExCuid2.generate()
      assert Documents.get_document(fake_id) == nil
    end
  end

  describe "get_document_updates_with_inheritance/1" do
    test "returns updates for a document with no base", %{user: user} do
      document = document_fixture(user)
      document_update_fixture(document, user, <<1, 2, 3>>)
      document_update_fixture(document, user, <<4, 5, 6>>)

      updates = Documents.get_document_updates_with_inheritance(document.id)
      assert updates == [<<1, 2, 3>>, <<4, 5, 6>>]
    end

    test "returns empty list when document has no updates", %{user: user} do
      document = document_fixture(user)
      assert Documents.get_document_updates_with_inheritance(document.id) == []
    end

    test "includes base document updates first", %{user: user} do
      base = document_fixture(user, %{name: "Base"})
      document_update_fixture(base, user, <<10, 11>>)

      child = document_fixture(user, %{name: "Child", base_document_id: base.id})
      document_update_fixture(child, user, <<20, 21>>)

      updates = Documents.get_document_updates_with_inheritance(child.id)
      assert updates == [<<10, 11>>, <<20, 21>>]
    end

    test "walks multi-level inheritance chain", %{user: user} do
      grandparent = document_fixture(user, %{name: "Grandparent"})
      document_update_fixture(grandparent, user, <<1>>)

      parent = document_fixture(user, %{name: "Parent", base_document_id: grandparent.id})
      document_update_fixture(parent, user, <<2>>)

      child = document_fixture(user, %{name: "Child", base_document_id: parent.id})
      document_update_fixture(child, user, <<3>>)

      updates = Documents.get_document_updates_with_inheritance(child.id)
      assert updates == [<<1>>, <<2>>, <<3>>]
    end

    test "excludes soft-deleted updates", %{user: user} do
      document = document_fixture(user)
      document_update_fixture(document, user, <<1, 2>>)

      deleted = document_update_fixture(document, user, <<3, 4>>)

      deleted
      |> Ecto.Changeset.change(%{deleted_at: DateTime.truncate(DateTime.utc_now(), :second)})
      |> Repo.update!()

      updates = Documents.get_document_updates_with_inheritance(document.id)
      assert updates == [<<1, 2>>]
    end
  end

  describe "create_document_update!/3" do
    test "creates a document update with user attribution", %{user: user} do
      document = document_fixture(user)
      update = Documents.create_document_update!(document.id, user.id, <<7, 8, 9>>)

      assert update.document_id == document.id
      assert update.user_id == user.id
      assert update.update == <<7, 8, 9>>
    end

    test "raises on nil user_id due to not-null constraint", %{user: user} do
      document = document_fixture(user)

      assert_raise Postgrex.Error, fn ->
        Documents.create_document_update!(document.id, nil, <<7, 8, 9>>)
      end
    end
  end

  describe "update_document_meta!/2" do
    test "updates the meta column on a document", %{user: user} do
      document = document_fixture(user)
      assert document.meta == %{}

      updated = Documents.update_document_meta!(document.id, %{"title" => "Hello"})
      assert updated.meta == %{"title" => "Hello"}

      reloaded = Documents.get_document!(document.id)
      assert reloaded.meta == %{"title" => "Hello"}
    end
  end

  describe "check_document_permission/2" do
    test "owner gets read_write", %{user: user} do
      document = document_fixture(user)
      assert Documents.check_document_permission(document.id, user.id) == {:ok, :read_write}
    end

    test "shared user with can_write gets read_write", %{user: user} do
      document = document_fixture(user)
      other_user = user_fixture()
      document_user_fixture(document, other_user, %{can_write: true})

      assert Documents.check_document_permission(document.id, other_user.id) == {:ok, :read_write}
    end

    test "shared user without can_write gets read_only", %{user: user} do
      document = document_fixture(user)
      other_user = user_fixture()
      document_user_fixture(document, other_user, %{can_write: false})

      assert Documents.check_document_permission(document.id, other_user.id) == {:ok, :read_only}
    end

    test "public document gives read_only to non-owner authenticated user", %{user: user} do
      document = document_fixture(user, %{is_public: true})
      other_user = user_fixture()

      assert Documents.check_document_permission(document.id, other_user.id) == {:ok, :read_only}
    end

    test "public document gives read_only to anonymous user", %{user: user} do
      document = document_fixture(user, %{is_public: true})

      assert Documents.check_document_permission(document.id, nil) == {:ok, :read_only}
    end

    test "private document returns not_found for non-shared user", %{user: user} do
      document = document_fixture(user)
      other_user = user_fixture()

      assert Documents.check_document_permission(document.id, other_user.id) ==
               {:error, :not_found}
    end

    test "private document returns not_found for anonymous user", %{user: user} do
      document = document_fixture(user)

      assert Documents.check_document_permission(document.id, nil) == {:error, :not_found}
    end

    test "nonexistent document returns not_found" do
      fake_id = ExCuid2.generate()

      assert Documents.check_document_permission(fake_id, nil) == {:error, :not_found}
    end

    test "soft-deleted document_user is not considered", %{user: user} do
      document = document_fixture(user)
      other_user = user_fixture()
      du = document_user_fixture(document, other_user, %{can_write: true})

      du
      |> Ecto.Changeset.change(%{deleted_at: DateTime.truncate(DateTime.utc_now(), :second)})
      |> Repo.update!()

      assert Documents.check_document_permission(document.id, other_user.id) ==
               {:error, :not_found}
    end
  end

  describe "create_document/3" do
    test "creates a document with valid type and default name", %{user: user} do
      assert {:ok, document} = Documents.create_document(user.id, "presentation")
      assert document.name == "Untitled"
      assert document.type == "presentation"
      assert document.user_id == user.id
      assert document.is_public == false
    end

    test "creates a document with custom name", %{user: user} do
      assert {:ok, document} = Documents.create_document(user.id, "theme", %{name: "My Theme"})
      assert document.name == "My Theme"
      assert document.type == "theme"
    end

    test "creates a document with all optional attrs", %{user: user} do
      base = document_fixture(user)

      attrs = %{
        name: "Custom",
        is_public: true,
        meta: %{"key" => "value"},
        base_document_id: base.id
      }

      assert {:ok, document} = Documents.create_document(user.id, "event", attrs)
      assert document.name == "Custom"
      assert document.is_public == true
      assert document.meta == %{"key" => "value"}
      assert document.base_document_id == base.id
    end

    test "rejects invalid type", %{user: user} do
      assert {:error, :invalid_type} = Documents.create_document(user.id, "invalid")
    end

    test "accepts all valid types", %{user: user} do
      for type <- ~w(presentation theme event) do
        assert {:ok, doc} = Documents.create_document(user.id, type)
        assert doc.type == type
      end
    end
  end

  describe "delete_document/2" do
    test "soft-deletes a document owned by the user", %{user: user} do
      document = document_fixture(user)
      assert {:ok, deleted} = Documents.delete_document(document.id, user.id)
      assert deleted.deleted_at != nil
    end

    test "returns unauthorized for non-owner", %{user: user} do
      document = document_fixture(user)
      other_user = user_fixture()
      assert {:error, :unauthorized} = Documents.delete_document(document.id, other_user.id)
    end

    test "returns not_found for nonexistent document" do
      fake_id = ExCuid2.generate()
      assert {:error, :not_found} = Documents.delete_document(fake_id, ExCuid2.generate())
    end
  end

  describe "update_document/3" do
    test "updates name for owner", %{user: user} do
      document = document_fixture(user)
      assert {:ok, updated} = Documents.update_document(document.id, user.id, %{name: "New Name"})
      assert updated.name == "New Name"
    end

    test "updates is_public for owner", %{user: user} do
      document = document_fixture(user)
      assert {:ok, updated} = Documents.update_document(document.id, user.id, %{is_public: true})
      assert updated.is_public == true
    end

    test "updates meta for owner", %{user: user} do
      document = document_fixture(user)

      assert {:ok, updated} =
               Documents.update_document(document.id, user.id, %{meta: %{"key" => "val"}})

      assert updated.meta == %{"key" => "val"}
    end

    test "returns unauthorized for non-owner", %{user: user} do
      document = document_fixture(user)
      other_user = user_fixture()

      assert {:error, :unauthorized} =
               Documents.update_document(document.id, other_user.id, %{name: "X"})
    end

    test "returns not_found for nonexistent document" do
      fake_id = ExCuid2.generate()
      assert {:error, :not_found} = Documents.update_document(fake_id, ExCuid2.generate(), %{})
    end
  end

  describe "list_user_documents/1" do
    test "returns owned documents", %{user: user} do
      doc = document_fixture(user, %{name: "My Doc", type: "presentation"})
      docs = Documents.list_user_documents(user.id)

      assert length(docs) == 1
      assert hd(docs).id == doc.id
      assert hd(docs).is_owner == true
      assert hd(docs).can_write == true
    end

    test "returns shared documents", %{user: user} do
      other_user = user_fixture()
      doc = document_fixture(user)
      document_user_fixture(doc, other_user, %{can_write: true})

      docs = Documents.list_user_documents(other_user.id)
      assert length(docs) == 1
      assert hd(docs).id == doc.id
      assert hd(docs).is_owner == false
      assert hd(docs).can_write == true
    end

    test "excludes soft-deleted documents", %{user: user} do
      doc = document_fixture(user)

      doc
      |> Ecto.Changeset.change(%{deleted_at: DateTime.truncate(DateTime.utc_now(), :second)})
      |> Repo.update!()

      assert Documents.list_user_documents(user.id) == []
    end

    test "orders by updated_at descending", %{user: user} do
      doc1 = document_fixture(user, %{name: "First"})
      doc2 = document_fixture(user, %{name: "Second"})

      # Force doc1 to have a later updated_at
      one_hour_later = DateTime.add(DateTime.utc_now(:second), 3600)

      doc1
      |> Ecto.Changeset.change(%{updated_at: one_hour_later})
      |> Repo.update!()

      docs = Documents.list_user_documents(user.id)
      assert Enum.at(docs, 0).id == doc1.id
      assert Enum.at(docs, 1).id == doc2.id
    end
  end

  describe "list_user_themes/1" do
    test "returns system themes for any user", %{user: user} do
      _system_theme =
        document_fixture(user, %{
          name: "System Theme",
          type: "theme",
          meta: %{"isSystemTheme" => "true"}
        })

      other_user = user_fixture()
      themes = Documents.list_user_themes(other_user.id)
      assert length(themes) == 1
      assert hd(themes).name == "System Theme"
      assert hd(themes).isSystemTheme == true
    end

    test "returns user-owned themes", %{user: user} do
      _theme = document_fixture(user, %{name: "My Theme", type: "theme"})

      themes = Documents.list_user_themes(user.id)
      assert length(themes) == 1
      assert hd(themes).name == "My Theme"
      assert hd(themes).isSystemTheme == false
    end

    test "excludes soft-deleted themes", %{user: user} do
      theme = document_fixture(user, %{name: "Deleted Theme", type: "theme"})

      theme
      |> Ecto.Changeset.change(%{deleted_at: DateTime.truncate(DateTime.utc_now(), :second)})
      |> Repo.update!()

      assert Documents.list_user_themes(user.id) == []
    end

    test "combines system and user themes", %{user: user} do
      _system =
        document_fixture(user, %{
          name: "System",
          type: "theme",
          meta: %{"isSystemTheme" => "true"}
        })

      _custom = document_fixture(user, %{name: "Custom", type: "theme"})

      themes = Documents.list_user_themes(user.id)
      assert length(themes) == 2
    end
  end
end

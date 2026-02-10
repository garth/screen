defmodule ScreenWeb.UserSocketTest do
  use ScreenWeb.ChannelCase, async: true

  alias ScreenWeb.UserSocket

  import Screen.AccountsFixtures

  describe "connect/3 with session-based auth" do
    test "authenticates with a valid session token in connect_info" do
      user = user_fixture()
      token = Screen.Accounts.generate_user_session_token(user)

      assert {:ok, socket} =
               connect(UserSocket, %{}, connect_info: %{session: %{"user_token" => token}})

      assert socket.assigns.user.id == user.id
    end

    test "assigns nil user for invalid session token" do
      assert {:ok, socket} =
               connect(UserSocket, %{}, connect_info: %{session: %{"user_token" => "invalid"}})

      assert socket.assigns.user == nil
    end

    test "assigns nil user when no session token in connect_info" do
      assert {:ok, socket} =
               connect(UserSocket, %{}, connect_info: %{session: %{}})

      assert socket.assigns.user == nil
    end

    test "assigns nil user when no session in connect_info" do
      assert {:ok, socket} = connect(UserSocket, %{}, connect_info: %{})
      assert socket.assigns.user == nil
    end
  end

  describe "id/1" do
    test "returns user-scoped id for authenticated socket" do
      user = user_fixture()
      token = Screen.Accounts.generate_user_session_token(user)

      {:ok, socket} =
        connect(UserSocket, %{}, connect_info: %{session: %{"user_token" => token}})

      assert UserSocket.id(socket) == "users_socket:#{user.id}"
    end

    test "returns nil for anonymous socket" do
      {:ok, socket} =
        connect(UserSocket, %{}, connect_info: %{session: %{}})

      assert UserSocket.id(socket) == nil
    end
  end
end

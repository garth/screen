defmodule ScreenWeb.UserSocketTest do
  use ScreenWeb.ChannelCase, async: true

  alias ScreenWeb.UserSocket

  import Screen.AccountsFixtures

  describe "connect/3" do
    test "authenticates with a valid session token" do
      user = user_fixture()
      token = Screen.Accounts.generate_user_session_token(user)

      assert {:ok, socket} = connect(UserSocket, %{"token" => token})
      assert socket.assigns.user.id == user.id
    end

    test "connects with nil user for invalid token" do
      assert {:ok, socket} = connect(UserSocket, %{"token" => "invalid"})
      assert socket.assigns.user == nil
    end

    test "connects with nil user when no token provided" do
      assert {:ok, socket} = connect(UserSocket, %{})
      assert socket.assigns.user == nil
    end
  end

  describe "id/1" do
    test "returns user-scoped id for authenticated socket" do
      user = user_fixture()
      token = Screen.Accounts.generate_user_session_token(user)

      {:ok, socket} = connect(UserSocket, %{"token" => token})
      assert UserSocket.id(socket) == "users_socket:#{user.id}"
    end

    test "returns nil for anonymous socket" do
      {:ok, socket} = connect(UserSocket, %{})
      assert UserSocket.id(socket) == nil
    end
  end
end
